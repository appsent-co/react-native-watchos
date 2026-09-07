#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
"$NODE_BINARY" -e 'require("./expo-modules/compatibility.cjs").resolveNativeBuild(process.cwd())'
"$NODE_BINARY" expo-modules/prepare.cjs
export RNW_ROOT="$ROOT_DIR"
export PODS_ROOT="$ROOT_DIR/build/expo-modules-jsi/headers-pods"
export RN_ROOT
RN_ROOT=$("$NODE_BINARY" -p 'require("node:path").dirname(require.resolve("react-native/package.json"))')
for platform in watchsimulator watchos; do
  PLATFORM_NAME="$platform" "$ROOT_DIR/build/expo-modules-jsi/apple/scripts/build-xcframework.sh"
done
mkdir -p expo-modules/jsi/build
rm -rf expo-modules/jsi/build/ExpoModulesJSI.xcframework
cp -pR build/expo-modules-jsi/apple/Products/ExpoModulesJSI.xcframework expo-modules/jsi/build/
"$NODE_BINARY" scripts/verify-package.cjs --record
