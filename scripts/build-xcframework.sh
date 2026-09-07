#!/bin/bash
set -eo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# Keep source checkouts, including local patches, even for --clean. Each
# requested Hermes ref gets its own checkout so an RN upgrade cannot silently
# reuse the previous engine or overwrite a developer's source changes.
if [ "${1:-}" = "--clean" ]; then
    echo "Clean rebuild requested — removing compiled artifacts (preserving Hermes sources)."
    rm -rf build/hermes/build build/third-party
fi
rm -rf build/jsi build/host build/reactcommon build/xcframework
mkdir -p build/hermes/sources build/xcframework

echo "Determining Hermes version..."
HERMES_VERSION_FILE="node_modules/react-native/sdks/.hermesversion"
# RN 0.84+ uses Hermes V1 by default. Match its hermes-compiler package so
# release bytecode and the watch runtime stay compatible.
if [ -f node_modules/react-native/sdks/.hermesv1version ]; then
    HERMES_VERSION_FILE="node_modules/react-native/sdks/.hermesv1version"
fi
HERMES_REF=$(cat "$HERMES_VERSION_FILE")
if [[ -z "$HERMES_REF" || "$HERMES_REF" == -* || "$HERMES_REF" == *[[:space:]]* ]]; then
    echo "Error: invalid Hermes git ref in $HERMES_VERSION_FILE" >&2
    exit 1
fi
echo "Using Hermes ref: $HERMES_REF"

# Retain compatibility with existing caches only when their HEAD actually
# matches RN's requested ref. Otherwise leave that checkout untouched.
HERMES_SOURCE="$(pwd)/build/hermes/source"
HERMES_COMMIT=$(git -C "$HERMES_SOURCE" rev-parse --verify "$HERMES_REF^{commit}" 2>/dev/null || true)
if [ -z "$HERMES_COMMIT" ] || [ "$(git -C "$HERMES_SOURCE" rev-parse HEAD 2>/dev/null || true)" != "$HERMES_COMMIT" ]; then
    HERMES_REF_KEY=$(printf '%s' "$HERMES_REF" | shasum -a 256 | cut -c1-16)
    HERMES_SOURCE="$(pwd)/build/hermes/sources/$HERMES_REF_KEY"
    if [ ! -e "$HERMES_SOURCE" ]; then
        echo "Fetching Hermes $HERMES_REF into $HERMES_SOURCE..."
        # Fetch in a temporary directory so interruption cannot poison the cache.
        HERMES_FETCH_DIR=$(mktemp -d "$(pwd)/build/hermes/sources/.fetch-$HERMES_REF_KEY.XXXXXX")
        git init -q "$HERMES_FETCH_DIR"
        git -C "$HERMES_FETCH_DIR" remote add origin https://github.com/facebook/hermes.git
        git -C "$HERMES_FETCH_DIR" fetch --depth 1 origin "$HERMES_REF"
        git -C "$HERMES_FETCH_DIR" checkout --detach FETCH_HEAD
        git -C "$HERMES_FETCH_DIR" update-ref refs/rnw/source HEAD
        printf '%s\n' "$HERMES_REF" > "$HERMES_FETCH_DIR/.git/rnw-source-ref"
        mv "$HERMES_FETCH_DIR" "$HERMES_SOURCE"
    fi
    # Refuse an incomplete cache or a manually switched checkout. Never reset
    # or clean source files: the user may have made intentional local changes.
    if [ "$(cat "$HERMES_SOURCE/.git/rnw-source-ref" 2>/dev/null || true)" != "$HERMES_REF" ] ||
       [ "$(git -C "$HERMES_SOURCE" rev-parse HEAD 2>/dev/null || true)" != "$(git -C "$HERMES_SOURCE" rev-parse refs/rnw/source 2>/dev/null || true)" ]; then
        echo "Error: Hermes cache at $HERMES_SOURCE is incomplete or checked out at a different ref." >&2
        echo "Move that directory aside and retry; its files have been preserved." >&2
        exit 1
    fi
fi
echo "Using Hermes source at $HERMES_SOURCE ($(git -C "$HERMES_SOURCE" rev-parse HEAD))"

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
    local cache_key stamp="build/third-party/$slice/.rnw-build-key"
    cache_key=$({
        printf '%s\n' "$(pwd)"
        shasum -a 256 cmake/third-party/CMakeLists.txt
        printf '%s\n' "$plat" "$archs" "$WATCHOS_DEPLOYMENT_TARGET"
        xcodebuild -version
        cmake --version
    } | shasum -a 256 | cut -d ' ' -f 1)
    if [ "$(cat "$stamp" 2>/dev/null || true)" = "$cache_key" ] &&
       [ -f "build/third-party/$slice/install/lib/libfolly.a" ] &&
       [ -f "build/third-party/$slice/install/lib/libglog.a" ] &&
       [ -f "build/third-party/$slice/install/lib/libdouble-conversion.a" ]; then
        echo "Reusing matching third-party cache for $slice"
        return
    fi
    echo "Building third-party for $slice ($plat / $archs)..."
    rm -rf "build/third-party/$slice"
    cmake -S cmake/third-party -B build/third-party/$slice \
        -GXcode \
        -DCMAKE_SYSTEM_NAME=watchOS \
        -DPLATFORM_NAME=$plat \
        -DCMAKE_OSX_ARCHITECTURES="$archs" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET="$WATCHOS_DEPLOYMENT_TARGET" \
        -DCMAKE_INSTALL_PREFIX=build/third-party/$slice/install
    cmake --build build/third-party/$slice --config MinSizeRel --target install
    printf '%s\n' "$cache_key" > "$stamp"
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
        -DHERMES_SOURCE_DIR="$HERMES_SOURCE" \
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

    # Expo's native EventEmitter reports listener exceptions through this
    # upstream header-only helper. Its only dependency is the JSI API above.
    mkdir -p "build/xcframework/$slice/Headers/cxxreact"
    cp "node_modules/react-native/ReactCommon/cxxreact/ErrorUtils.h" \
        "build/xcframework/$slice/Headers/cxxreact/"

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
# `--clean` as the first argument to wipe compiled artifacts, preserving sources.
# -----------------------------------------------------------------------------

echo ""
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
"$NODE_BINARY" scripts/verify-package.cjs --record-runtime

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
