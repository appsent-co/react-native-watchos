#!/bin/bash
set -euo pipefail
OVERLAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$OVERLAY_DIR/../.." && pwd)"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
"$NODE_BINARY" "$OVERLAY_DIR/prepare.mjs"
BUILD_ROOT="$ROOT_DIR/build/expo-modules-jsi"
case "${1:-all}" in
  simulator) export PLATFORM_NAME=watchsimulator ;;
  device) export PLATFORM_NAME=watchos ;;
  all) unset PLATFORM_NAME ;;
  *) echo "Usage: $0 [simulator|device|all]" >&2; exit 1 ;;
esac
export PODS_ROOT="$BUILD_ROOT/headers-pods"
export RN_ROOT
RN_ROOT=$("$NODE_BINARY" -e 'console.log(require("node:path").dirname(require.resolve("react-native/package.json", { paths: [process.argv[1]] })))' "$ROOT_DIR")
export REACT_NATIVE_PATH="$RN_ROOT"
"$BUILD_ROOT/apple/scripts/build-xcframework.sh"

# Ship real files: npm tarballs do not preserve a symlink to a workspace build.
mkdir -p "$OVERLAY_DIR/build"
rm -rf "$OVERLAY_DIR/build/ExpoModulesJSI.xcframework"
cp -pR "$BUILD_ROOT/apple/Products/ExpoModulesJSI.xcframework" "$OVERLAY_DIR/build/ExpoModulesJSI.xcframework"
cp "$BUILD_ROOT/provenance.json" "$OVERLAY_DIR/build/provenance.json"
