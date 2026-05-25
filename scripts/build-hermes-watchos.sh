#!/bin/bash
set -e

# Parse arguments and convert to absolute paths
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Usage: $0 <hermes_source_dir> <build_dir> <output_dir> [platform_name] [archs] [deployment_target]"
  exit 1
fi

HERMES_SOURCE_DIR="$(cd "$1" && pwd)"
mkdir -p "$2"
BUILD_DIR="$(cd "$2" && pwd)"
mkdir -p "$3"
OUTPUT_DIR="$(cd "$3" && pwd)"
PLATFORM_NAME="${4:-watchos}"  # watchos or watchsimulator
ARCHS="${5:-arm64_32;arm64}"  # Default architectures
DEPLOYMENT_TARGET="${6:-7.0}"

# Determine build type based on configuration
cmake_build_type="MinSizeRel"  # Use MinSizeRel for watchOS (size constrained)
enable_debugger="false"        # Disable debugger for watchOS (reduces binary size)

echo "========================================"
echo "Building Hermes for watchOS"
echo "Source: $HERMES_SOURCE_DIR"
echo "Build: $BUILD_DIR"
echo "Output: $OUTPUT_DIR"
echo "Platform: $PLATFORM_NAME"
echo "Architectures: $ARCHS"
echo "Deployment Target: $DEPLOYMENT_TARGET"
echo "========================================"

# Find CMake
CMAKE_BINARY="${CMAKE_BINARY:-$(which cmake)}"

if [ ! -x "$CMAKE_BINARY" ]; then
  echo "Error: CMake not found. Please install CMake or set CMAKE_BINARY environment variable."
  exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"
mkdir -p "$OUTPUT_DIR"

# Patch Hermes source for watchOS compatibility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/patch-hermes-watchos.sh" ]; then
  echo "Applying watchOS patches..."
  "$SCRIPT_DIR/patch-hermes-watchos.sh" "$HERMES_SOURCE_DIR"
fi

# Build hermesc for the host (needed for bytecode compilation)
# Hermes is a cross-compiled build: the target compiles for watchOS, but
# Hermes also needs to invoke `hermesc` at build time to AOT-compile its own
# InternalBytecode.js. That tool must run on the host (macOS), so we build it
# in a separate host configuration and import via `IMPORT_HOST_COMPILERS`.
# (Hermes 0.16 renamed the variable from `IMPORT_HERMESC` to
# `IMPORT_HOST_COMPILERS`, and the imported target from `hermesc` to
# `native-hermesc`.)
HERMESC_BUILD_DIR="$BUILD_DIR/host_hermesc"
HERMESC_IMPORT_FILE="$HERMESC_BUILD_DIR/ImportHostCompilers.cmake"
if [ ! -f "$HERMESC_IMPORT_FILE" ]; then
  echo "Building hermesc for host..."
  mkdir -p "$HERMESC_BUILD_DIR"

  "$CMAKE_BINARY" \
    -S "$HERMES_SOURCE_DIR" \
    -B "$HERMESC_BUILD_DIR" \
    -DHERMES_ENABLE_LIBFUZZER=OFF \
    -DHERMES_ENABLE_FUZZILLI=OFF \
    -DHERMES_ENABLE_TEST_SUITE=OFF \
    -DCMAKE_BUILD_TYPE=Release

  "$CMAKE_BINARY" \
    --build "$HERMESC_BUILD_DIR" \
    --target hermesc \
    -j "$(sysctl -n hw.ncpu)"

  echo "Hermesc built successfully at $HERMESC_BUILD_DIR/bin/hermesc"
fi

# Configure Hermes for watchOS
echo "Configuring Hermes for $PLATFORM_NAME..."

"$CMAKE_BINARY" \
  -S "$HERMES_SOURCE_DIR" \
  -B "$BUILD_DIR/$PLATFORM_NAME" \
  -DHERMES_APPLE_TARGET_PLATFORM:STRING="$PLATFORM_NAME" \
  -DCMAKE_OSX_ARCHITECTURES:STRING="$ARCHS" \
  -DCMAKE_OSX_DEPLOYMENT_TARGET:STRING="$DEPLOYMENT_TARGET" \
  -DHERMES_ENABLE_DEBUGGER:BOOLEAN="$enable_debugger" \
  -DHERMES_ENABLE_INTL:BOOLEAN=false \
  -DHERMES_ENABLE_LIBFUZZER:BOOLEAN=false \
  -DHERMES_ENABLE_FUZZILLI:BOOLEAN=false \
  -DHERMES_ENABLE_TEST_SUITE:BOOLEAN=false \
  -DHERMES_ENABLE_BITCODE:BOOLEAN=false \
  -DHERMES_BUILD_APPLE_FRAMEWORK:BOOLEAN=true \
  -DHERMES_BUILD_SHARED_JSI:BOOLEAN=false \
  -DCMAKE_CXX_FLAGS:STRING="-gdwarf -fvisibility=hidden" \
  -DCMAKE_C_FLAGS:STRING="-gdwarf -fvisibility=hidden" \
  -DIMPORT_HOST_COMPILERS:PATH="$HERMESC_IMPORT_FILE" \
  -DHERMES_RELEASE_VERSION="for React Native watchOS" \
  -DCMAKE_BUILD_TYPE="$cmake_build_type"

# Build Hermes framework. Hermes 0.16+ uses target name `hermesvm` (older
# versions used `libhermes`). The produced framework is `hermes.framework`.
echo "Building Hermes framework..."

"$CMAKE_BINARY" \
  --build "$BUILD_DIR/$PLATFORM_NAME" \
  --target hermesvm \
  -j "$(sysctl -n hw.ncpu)"

# Copy framework to output directory. Resolve the actual location via `find`
# because cmake places framework bundles in different paths depending on
# generator (Xcode vs Make) and `LIBRARY_OUTPUT_DIRECTORY`.
echo "Copying framework to output directory..."
HERMES_FRAMEWORK_PATH=$(find "$BUILD_DIR/$PLATFORM_NAME" -name "hermes.framework" -type d | head -1)
if [ -z "$HERMES_FRAMEWORK_PATH" ]; then
  echo "Error: hermes.framework not found in $BUILD_DIR/$PLATFORM_NAME"
  exit 1
fi
cp -pR "$HERMES_FRAMEWORK_PATH" "$OUTPUT_DIR/"

# Hermes's own CMakeLists doesn't add the public API headers as PUBLIC_HEADER
# on the framework target, so the produced bundle has no Headers/ directory.
# Copy them in by hand so `#import <hermesvm/hermes.h>` works for consumers.
FRAMEWORK_OUT="$OUTPUT_DIR/hermes.framework"
mkdir -p "$FRAMEWORK_OUT/Headers/Public"
cp "$HERMES_SOURCE_DIR/API/hermes/"*.h "$FRAMEWORK_OUT/Headers/"
if [ -d "$HERMES_SOURCE_DIR/public/hermes/Public" ]; then
  cp "$HERMES_SOURCE_DIR/public/hermes/Public/"*.h "$FRAMEWORK_OUT/Headers/Public/"
fi

echo "========================================"
echo "Hermes framework built successfully!"
echo "Location: $OUTPUT_DIR/hermes.framework"
echo "========================================"
