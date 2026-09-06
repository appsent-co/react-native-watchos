#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
"$NODE_BINARY" -e 'require("./expo-modules/compatibility.cjs").resolveCompatibility(process.cwd())'
"$ROOT_DIR/expo-modules/jsi/build.sh" all
"$NODE_BINARY" "$ROOT_DIR/expo-modules/core/scripts/generate-overlay.cjs" --project-root "$ROOT_DIR"
"$NODE_BINARY" "$ROOT_DIR/scripts/verify-package.cjs" --record
