#!/bin/bash
set -eo pipefail

# -----------------------------------------------------------------------------
# Builds two XCFrameworks linked into the watch app via this package's
# CocoaPods (ReactNativeWatchOS + ReactNativeWatchOSCxx; see cocoapods/autolink.rb):
#
#   1. build/xcframework/hermes.xcframework
#        — repackages hermes.framework as a watchOS XCFramework with one slice
#          per platform (device + simulator). Dynamic framework, embedded by
#          the consumer app.
#
#   2. build/xcframework/ReactNativeWatchOSCxx.xcframework
#        — static library combining JSI + the ObjC++ RNWHermesHost + the
#          React Native TurboModule core (react_nativemodule_core,
#          react_bridging, react_utils, react_featureflags, reactperflogger,
#          react_debug) + their C++ deps (folly, glog, double-conversion).
#          Plus the umbrella header + module.modulemap so Swift can import.
#
# Build dependency chain:
#   cmake/third-party  (folly/glog/fmt/etc, one-time, persistent cache)
#       └─ cmake/reactcommon  (cxxreact stack + TurboModule core)
#       └─ cmake/jsi
#       └─ cmake/host
#       └─ libtool combine → xcframework
# -----------------------------------------------------------------------------

echo "Building ReactNativeWatchOS XCFrameworks..."

# Architectures (semicolon-separated — these feed CMAKE_OSX_ARCHITECTURES):
#   - Device: arm64 (Series 9 / 10 / Ultra 2 / later) + arm64_32 (Series 6-8 /
#     SE 2). Xcode resolves the watch app target's device ARCHS to both, so the
#     prebuilt slice must be a fat archive covering both or arm64_32 links fail
#     with "undefined symbol" for everything the xcframework provides.
#   - Simulator: arm64 (Apple Silicon Macs only). Add x86_64 for Intel Macs.
DEVICE_ARCHS="arm64;arm64_32"
SIMULATOR_ARCHS="arm64"

WATCHOS_DEPLOYMENT_TARGET="9.0"

# Clean previous *build* artifacts but keep the Hermes source clone +
# host_hermesc compilation across runs — those don't change between
# iterations and take the longest. Pass --clean as the first arg for a
# fully clean rebuild.
if [ "$1" = "--clean" ]; then
    echo "Clean rebuild requested — removing all build artifacts."
    rm -rf build
fi
rm -rf build/hermes/build/sim build/hermes/build/dev
rm -rf build/hermes/build/output-sim build/hermes/build/output-dev
rm -rf build/jsi build/host build/reactcommon build/xcframework
# Keep build/third-party across runs — it takes 5+ minutes (folly/glog fetch
# + compile) and changes only when cmake/third-party/CMakeLists.txt changes.
# `--clean` above wipes the whole build/ tree if a full reset is needed.
mkdir -p build/hermes/source
mkdir -p build/xcframework

# Get Hermes tag/commit from .hermesversion. The file content is the literal
# git ref to check out — both schemes (`hermes-vX.Y.Z` for tagged releases and
# `hermes-YYYY-MM-DD-RNvX.Y.Z-<sha>` for date-stamped snapshots) work directly
# as tag names in facebook/hermes.
echo "Determining Hermes version..."
HERMES_REF=$(cat node_modules/react-native/sdks/.hermesversion)
echo "Using Hermes ref: $HERMES_REF"

HERMES_SOURCE="$(pwd)/build/hermes/source"
if [ ! -d "$HERMES_SOURCE/.git" ]; then
    echo "Cloning Hermes..."
    rm -rf "$HERMES_SOURCE"
    git clone https://github.com/facebook/hermes.git "$HERMES_SOURCE"
    ( cd "$HERMES_SOURCE" && git checkout "$HERMES_REF" )
else
    echo "Reusing existing Hermes source at $HERMES_SOURCE"
fi

# Apply Hermes watchOS patches (idempotent — checks for existing markers)
./scripts/patch-hermes-watchos.sh "$HERMES_SOURCE"

BUILD_DIR="$(pwd)/build/hermes/build"
mkdir -p "$BUILD_DIR"

# -----------------------------------------------------------------------------
# 1. Build Hermes for both slices
# -----------------------------------------------------------------------------

echo "Building Hermes for watchOS simulator..."
./scripts/build-hermes-watchos.sh \
    "$HERMES_SOURCE" \
    "$BUILD_DIR/sim" \
    "$BUILD_DIR/output-sim" \
    "watchsimulator" \
    "$SIMULATOR_ARCHS" \
    "$WATCHOS_DEPLOYMENT_TARGET"

echo "Building Hermes for watchOS device..."
./scripts/build-hermes-watchos.sh \
    "$HERMES_SOURCE" \
    "$BUILD_DIR/dev" \
    "$BUILD_DIR/output-dev" \
    "watchos" \
    "$DEVICE_ARCHS" \
    "$WATCHOS_DEPLOYMENT_TARGET"

# -----------------------------------------------------------------------------
# 1b. Build third-party C++ deps (folly/glog/fmt/double-conversion/boost/
#     fast_float) for both slices. Skipped if already installed — the fetch
#     + compile takes ~5 minutes. Pass --clean above to force a rebuild.
# -----------------------------------------------------------------------------

build_third_party_slice() {
    local slice="$1" plat="$2" archs="$3"
    if [ -f "build/third-party/$slice/install/lib/libfolly.a" ]; then
        echo "Reusing cached third-party for $slice (lib/libfolly.a found)"
        return
    fi
    echo "Building third-party for $slice ($plat / $archs)..."
    cmake -S cmake/third-party -B build/third-party/$slice \
        -GXcode \
        -DCMAKE_SYSTEM_NAME=watchOS \
        -DPLATFORM_NAME=$plat \
        -DCMAKE_OSX_ARCHITECTURES="$archs" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
        -DCMAKE_INSTALL_PREFIX=build/third-party/$slice/install
    cmake --build build/third-party/$slice --config MinSizeRel --target install
}

build_third_party_slice device watchos "$DEVICE_ARCHS"
build_third_party_slice simulator watchsimulator "$SIMULATOR_ARCHS"

# -----------------------------------------------------------------------------
# 1c. Build ReactCommon (cxxreact + TurboModule core + bridging/utils/
#     featureflags/perflogger/debug/logger/jsinspector_stub). Depends on
#     the third-party archives produced above (linked via IMPORTED targets
#     in cmake/reactcommon/CMakeLists.txt).
# -----------------------------------------------------------------------------

build_reactcommon_slice() {
    local slice="$1" plat="$2" archs="$3"
    echo "Building reactcommon for $slice ($plat / $archs)..."
    cmake -S cmake/reactcommon -B build/reactcommon/$slice \
        -GXcode \
        -DCMAKE_SYSTEM_NAME=watchOS \
        -DPLATFORM_NAME=$plat \
        -DCMAKE_OSX_ARCHITECTURES="$archs" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
        -DCMAKE_INSTALL_PREFIX=build/reactcommon/$slice/install
    cmake --build build/reactcommon/$slice --config MinSizeRel --target install
}

build_reactcommon_slice device watchos "$DEVICE_ARCHS"
build_reactcommon_slice simulator watchsimulator "$SIMULATOR_ARCHS"

# -----------------------------------------------------------------------------
# 2. Build JSI for both slices
# -----------------------------------------------------------------------------

echo "Building JSI for watchOS device..."
cmake -S cmake/jsi -B build/jsi/device \
    -GXcode \
    -DCMAKE_SYSTEM_NAME=watchOS \
    -DPLATFORM_NAME=watchos \
    -DCMAKE_OSX_ARCHITECTURES="$DEVICE_ARCHS" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
    -DHERMES_SOURCE_DIR="$HERMES_SOURCE" \
    -DCMAKE_INSTALL_PREFIX=build/jsi/device/install
cmake --build build/jsi/device --config MinSizeRel --target install

echo "Building JSI for watchOS simulator..."
cmake -S cmake/jsi -B build/jsi/simulator \
    -GXcode \
    -DCMAKE_SYSTEM_NAME=watchOS \
    -DPLATFORM_NAME=watchsimulator \
    -DCMAKE_OSX_ARCHITECTURES="$SIMULATOR_ARCHS" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
    -DHERMES_SOURCE_DIR="$HERMES_SOURCE" \
    -DCMAKE_INSTALL_PREFIX=build/jsi/simulator/install
cmake --build build/jsi/simulator --config Debug --target install

# -----------------------------------------------------------------------------
# 3. Build the ObjC++ host (RNWHermesHost.mm) for both slices
# -----------------------------------------------------------------------------

echo "Building RNWHost (ObjC++ host) for watchOS device..."
cmake -S cmake/host -B build/host/device \
    -GXcode \
    -DCMAKE_SYSTEM_NAME=watchOS \
    -DPLATFORM_NAME=watchos \
    -DCMAKE_OSX_ARCHITECTURES="$DEVICE_ARCHS" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
    -DHERMES_FRAMEWORK_DIR="$BUILD_DIR/output-dev" \
    -DHERMES_SOURCE_DIR="$HERMES_SOURCE" \
    -DCMAKE_INSTALL_PREFIX=build/host/device/install
cmake --build build/host/device --config MinSizeRel --target install

echo "Building RNWHost (ObjC++ host) for watchOS simulator..."
cmake -S cmake/host -B build/host/simulator \
    -GXcode \
    -DCMAKE_SYSTEM_NAME=watchOS \
    -DPLATFORM_NAME=watchsimulator \
    -DCMAKE_OSX_ARCHITECTURES="$SIMULATOR_ARCHS" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
    -DHERMES_FRAMEWORK_DIR="$BUILD_DIR/output-sim" \
    -DHERMES_SOURCE_DIR="$HERMES_SOURCE" \
    -DCMAKE_INSTALL_PREFIX=build/host/simulator/install
cmake --build build/host/simulator --config Debug --target install

# -----------------------------------------------------------------------------
# 4. Combine JSI + RNWHost into a single static lib per slice, copy headers
# -----------------------------------------------------------------------------

for slice in device simulator; do
    mkdir -p "build/xcframework/$slice/Headers"

    # Combine JSI + RNWHost + ReactCommon TurboModule core + third-party C++
    # deps into a single .a. The reactcommon archives provide the symbols
    # RNWHermesHost.mm references via `<ReactCommon/TurboModuleBinding.h>`,
    # and folly/glog/double-conversion are dragged in transitively by the
    # TurboModule core's own translation units.
    libtool -static \
        -o "build/xcframework/$slice/libReactNativeWatchOSCxx.a" \
        "build/jsi/$slice/install/lib/libjsi.a" \
        "build/host/$slice/install/lib/libRNWHost.a" \
        "build/reactcommon/$slice/install/lib/libreact_nativemodule_core.a" \
        "build/reactcommon/$slice/install/lib/libreact_bridging.a" \
        "build/reactcommon/$slice/install/lib/libreact_utils.a" \
        "build/reactcommon/$slice/install/lib/libreact_featureflags.a" \
        "build/reactcommon/$slice/install/lib/libreactperflogger.a" \
        "build/reactcommon/$slice/install/lib/libreact_debug.a" \
        "build/third-party/$slice/install/lib/libfolly.a" \
        "build/third-party/$slice/install/lib/libglog.a" \
        "build/third-party/$slice/install/lib/libdouble-conversion.a"

    # JSI headers (jsi/jsi.h is referenced by RNWHermesHost.mm; consumer Swift
    # code never imports it, but if a future ObjC++ caller wants to use JSI
    # they can.)
    cp -R "build/jsi/$slice/install/include/jsi" \
        "build/xcframework/$slice/Headers/"

    # Public ObjC umbrella header + module map (this is what Swift imports as
    # `import ReactNativeWatchOSCxx`)
    cp -R "build/host/$slice/install/include/ReactNativeWatchOSCxx" \
        "build/xcframework/$slice/Headers/"

    # TurboModule headers from the cxxreact stack — exposed so third-party
    # module authors writing ObjC++ `.mm` files can `#include
    # <ReactCommon/TurboModule.h>` etc. against the same fork compiled
    # into the .a. These are the upstream RN cross-platform headers
    # (TurboModule.h, TurboModuleBinding.h, etc.), NOT our ObjC adapter.
    mkdir -p "build/xcframework/$slice/Headers/ReactCommon"
    cp -R "build/reactcommon/$slice/install/include/ReactCommon/." \
        "build/xcframework/$slice/Headers/ReactCommon/"
    cp -R "build/reactcommon/$slice/install/include/react" \
        "build/xcframework/$slice/Headers/"

    # Our watchOS-safe forks of <React/RCTBridgeModule.h> and
    # <ReactCommon/RCTTurboModule.h>. Layered on top of the cxxreact
    # headers copied above (same `ReactCommon/` dir gets our RCTTurboModule.h
    # added alongside upstream's TurboModule.h). The xcframework's Headers/
    # is on the consuming Xcode target's header search path, so a
    # maintainer's `#import <React/RCTBridgeModule.h>` resolves here on
    # watchOS and to RN's pod on iOS.
    mkdir -p "build/xcframework/$slice/Headers/React"
    cp -R "build/host/$slice/install/include/React/." \
        "build/xcframework/$slice/Headers/React/"
    cp -R "build/host/$slice/install/include/ReactCommon/." \
        "build/xcframework/$slice/Headers/ReactCommon/"

    # Empty stub headers that codegen-emitted `Native<Foo>Spec.h` files
    # `#import` unconditionally (RCTRequired, RCTTypeSafety/*,
    # React/RCTCxxConvert.h, React/RCTManagedPointer.h). Symbols inside
    # are only referenced by specs that use typed-object / struct args
    # — unsupported in v1, but the headers must exist for codegen's
    # `#import` lines to resolve.
    cp -R "build/host/$slice/install/include/RCTRequired" \
        "build/xcframework/$slice/Headers/"
    cp -R "build/host/$slice/install/include/RCTTypeSafety" \
        "build/xcframework/$slice/Headers/"

    # Module map must live alongside (or be referenced from) the headers root.
    # Place a top-level module map that re-exports the ReactNativeWatchOSCxx
    # module so consumers find it on the Headers search path.
    cp "apple/Sources/ReactNativeWatchOSCxx/include/ReactNativeWatchOSCxx/module.modulemap" \
        "build/xcframework/$slice/Headers/module.modulemap"
done

# -----------------------------------------------------------------------------
# 5. Create the two XCFrameworks
# -----------------------------------------------------------------------------

echo "Creating hermes.xcframework..."
rm -rf build/xcframework/hermes.xcframework
xcodebuild -create-xcframework \
    -framework "$BUILD_DIR/output-dev/hermes.framework" \
    -framework "$BUILD_DIR/output-sim/hermes.framework" \
    -output build/xcframework/hermes.xcframework

echo "Creating ReactNativeWatchOSCxx.xcframework..."
rm -rf build/xcframework/ReactNativeWatchOSCxx.xcframework
xcodebuild -create-xcframework \
    -library build/xcframework/device/libReactNativeWatchOSCxx.a \
    -headers build/xcframework/device/Headers \
    -library build/xcframework/simulator/libReactNativeWatchOSCxx.a \
    -headers build/xcframework/simulator/Headers \
    -output build/xcframework/ReactNativeWatchOSCxx.xcframework

# -----------------------------------------------------------------------------
# 6. Keep intermediate artifacts. Re-running this script reuses the Hermes
# source clone and host_hermesc compilation (the two longest steps),
# rebuilding only the watchOS/watchsimulator slices and our host code. Pass
# `--clean` as the first argument to wipe everything.
# -----------------------------------------------------------------------------

echo ""
echo "✅ XCFrameworks created successfully!"
echo "📦 build/xcframework/hermes.xcframework"
echo "📦 build/xcframework/ReactNativeWatchOSCxx.xcframework"
echo ""
echo "Slices:"
echo "  - watchOS device      (${DEVICE_ARCHS//;/, })"
echo "  - watchOS simulator   (${SIMULATOR_ARCHS//;/, })"
echo ""
echo "Next: re-run \`expo prebuild\` then \`pod install\` in example/ios, then"
echo "open example/ios/watchosexample.xcworkspace and Build & Run the watch"
echo "scheme on a device or simulator."
