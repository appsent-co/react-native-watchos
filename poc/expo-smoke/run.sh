#!/bin/bash
# Reproduce the non-UI Expo/watchOS proof. Generated files and logs stay in build/.
set -euo pipefail

SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SMOKE_DIR/../.." && pwd)"
BUILD_ROOT="$ROOT_DIR/build/poc/expo-smoke"
LOG_ROOT="$BUILD_ROOT/logs"
APP_ID="com.appsent.rnw-expo-smoke"
PHASE="${1:-all}"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

case "$PHASE" in
  all|build|app|device|run) ;;
  *) echo "Usage: $0 [all|build|app|device|run]" >&2; exit 2 ;;
esac
mkdir -p "$LOG_ROOT"
cd "$ROOT_DIR"

run_logged() {
  local label="$1"
  shift
  local log="$LOG_ROOT/$label.log"
  printf '[Expo smoke] %s\n' "$label"
  if "$@" > "$log" 2>&1; then
    return 0
  else
    local status=$?
    printf '[Expo smoke] %s failed (exit %s). Log: %s\n' "$label" "$status" "$log" >&2
    tail -60 "$log" >&2
    return "$status"
  fi
}

if [ "$PHASE" = "all" ] || [ "$PHASE" = "build" ]; then
  run_logged runtime-build "$ROOT_DIR/scripts/build-xcframework.sh"
  run_logged expo-build env NODE_BINARY="$NODE_BINARY" "$ROOT_DIR/scripts/build-expo-modules.sh"
fi

if [ "$PHASE" = "all" ] || [ "$PHASE" = "build" ] || [ "$PHASE" = "app" ]; then
  run_logged metro-bundle "$NODE_BINARY" "$SMOKE_DIR/bundle.cjs"
  run_logged project-generate ruby "$SMOKE_DIR/generate-project.rb"
  run_logged pod-install pod install --project-directory="$BUILD_ROOT"
  run_logged simulator-build xcodebuild \
    -workspace "$BUILD_ROOT/ExpoSmoke.xcworkspace" \
    -scheme ExpoSmoke \
    -configuration Debug \
    -sdk watchsimulator \
    -destination 'generic/platform=watchOS Simulator' \
    -derivedDataPath "$BUILD_ROOT/DerivedData" \
    ARCHS=arm64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO \
    build
  printf '[Expo smoke] Build passed. Logs: %s\n' "$LOG_ROOT"
fi

if [ "$PHASE" = "device" ]; then
  run_logged device-build xcodebuild \
    -workspace "$BUILD_ROOT/ExpoSmoke.xcworkspace" \
    -scheme ExpoSmoke -configuration Release \
    -destination 'generic/platform=watchOS' \
    -derivedDataPath "$BUILD_ROOT/DerivedData-device" \
    ARCHS="arm64 arm64_32" ONLY_ACTIVE_ARCH=NO CODE_SIGNING_ALLOWED=NO build
fi

if [ "$PHASE" = "build" ] || [ "$PHASE" = "app" ] || [ "$PHASE" = "device" ]; then
  exit 0
fi

APP_PATH="$BUILD_ROOT/DerivedData/Build/Products/Debug-watchsimulator/ExpoSmoke.app"
if [ ! -d "$APP_PATH" ]; then
  echo "[Expo smoke] App is missing; run '$0 build' first." >&2
  exit 1
fi

# Read simctl's structured inventory so an iPhone simulator cannot be selected
# accidentally. An explicit UDID may select a stopped watch; bootstatus boots it.
xcrun simctl list devices available --json > "$LOG_ROOT/simulators.json"
SIMULATOR_UDID=$("$NODE_BINARY" - "$LOG_ROOT/simulators.json" <<'JS'
const fs = require('node:fs');
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const watches = Object.entries(inventory.devices)
  .filter(([runtime]) => runtime.includes('.watchOS-'))
  .flatMap(([, devices]) => devices)
  .filter(device => device.isAvailable !== false);
const requested = process.env.RNW_EXPO_SIMULATOR_UDID;
const selected = requested
  ? watches.find(device => device.udid.toLowerCase() === requested.toLowerCase())
  : watches.find(device => device.state === 'Booted');
if (!selected) {
  console.error(requested
    ? `RNW_EXPO_SIMULATOR_UDID does not identify an available watchOS simulator: ${requested}`
    : 'Boot a watchOS simulator, or set RNW_EXPO_SIMULATOR_UDID to an available watch simulator UUID.');
  process.exit(1);
}
process.stdout.write(selected.udid);
JS
)
printf '[Expo smoke] Simulator: %s\n' "$SIMULATOR_UDID"
run_logged simulator-ready xcrun simctl bootstatus "$SIMULATOR_UDID" -b
run_logged simulator-install xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
# Previous runs may leave both a live process and a passing result behind.
# Terminate only this fixture app, then clear only its generated result file.
xcrun simctl terminate "$SIMULATOR_UDID" "$APP_ID" > "$LOG_ROOT/simulator-terminate.log" 2>&1 || true
APP_DATA=$(xcrun simctl get_app_container "$SIMULATOR_UDID" "$APP_ID" data)
RESULT_FILE="$APP_DATA/Documents/expo-smoke-result.json"
rm -f "$RESULT_FILE" "$BUILD_ROOT/result.json"
run_logged simulator-launch xcrun simctl launch "$SIMULATOR_UDID" "$APP_ID"

TIMEOUT_SECONDS="${RNW_EXPO_TIMEOUT_SECONDS:-60}"
if [[ ! "$TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || [ "$TIMEOUT_SECONDS" -lt 1 ]; then
  echo '[Expo smoke] RNW_EXPO_TIMEOUT_SECONDS must be a positive integer.' >&2
  exit 2
fi
DEADLINE=$((SECONDS + TIMEOUT_SECONDS))
while [ "$SECONDS" -lt "$DEADLINE" ]; do
  if [ -s "$RESULT_FILE" ]; then
    # Wait through an incomplete write, but fail a complete negative result.
    if "$NODE_BINARY" - "$RESULT_FILE" "$BUILD_ROOT/result.json" <<'JS'
const fs = require('node:fs');
let result;
try {
  result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
} catch {
  process.exit(2);
}
fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n');
if (result?.success !== true) {
  console.error(`[Expo smoke] Runtime checks failed: ${result?.error ?? 'success was not true'}. Result: ${process.argv[3]}`);
  process.exit(1);
}
if (!Array.isArray(result.checks) || result.checks.length !== 6 ||
    result.lifecycle?.creates !== 4 || result.lifecycle?.destroys !== 4 ||
    result.primaryGenerations !== 3 || result.simultaneousHosts !== 2 || result.explicitFactoryCalls !== 1) {
  console.error(`[Expo smoke] Expected 6 checks, 3 primary generations, 2 simultaneous hosts, and 4 creates / 4 destroys. ${result.error ?? ''} Result: ${process.argv[3]}`);
  process.exit(1);
}
const labels = [
  'Expo JSI installer',
  'public module lookup',
  'real NativeModule',
  'sync Function',
  'runtime queue isolation',
  'native argument validation',
  'Record conversion',
  'Enumerable conversion',
  'invalid Enumerable rejection',
  'SharedObject identity and method',
  'SharedObject argument conversion',
  'SharedObject release',
  'fresh native state on reload',
  'fresh legacy registry on reload',
  'legacy protocol lookup',
  'legacy file system helpers',
  'fresh permission requester',
  'legacy permission resolution',
  'unknown permission rejection',
  'missing permission service rejection',
  'persistent file logging',
  'Swift async continuation',
  'async Promise resolution',
  'native event payload',
  'event listener removal',
  'async Promise rejection',
  'native work pending at teardown',
];
for (let generation = 1; generation <= 3; generation++) {
  const prefix = `generation ${generation}: EXPO_SMOKE_PASS:`;
  const passes = result.checks.filter(check => typeof check === 'string' && check.startsWith(prefix));
  const reported = passes.length === 1 ? passes[0].slice(prefix.length).split(', ') : [];
  if (passes.length !== 1 ||
      reported.length !== labels.length || !labels.every(label => reported.includes(label))) {
    console.error(`[Expo smoke] Generation ${generation} is missing its complete JavaScript proof. Result: ${process.argv[3]}`);
    process.exit(1);
  }
}
const companionLabels = [
  'companion starts with fresh native state',
  'companion runtime queue isolation',
  'companion initial event',
  'companion legacy registry starts fresh',
  'companion permission grant',
  'legacy registry survives other host reloads',
  'permission state stays in its runtime',
  'native state survives other host reloads',
  'SharedObject stays in its runtime',
  'events stay in their runtime',
  'companion scheduler remains live',
  'companion event after reloads',
  'companion native work pending at teardown',
];
const companionPrefix = 'EXPO_SMOKE_COMPANION_PASS:';
const companionPasses = result.checks.filter(check => typeof check === 'string' && check.startsWith(companionPrefix));
const companionChecks = companionPasses.length === 1 ? companionPasses[0].slice(companionPrefix.length).split(', ') : [];
if (companionChecks.length !== companionLabels.length || !companionLabels.every(label => companionChecks.includes(label)) ||
    !result.checks.includes('public host reload: 3 primary instances destroyed while companion stays alive') ||
    !result.checks.includes('lifecycle: all 4 unique module instances created and destroyed exactly once')) {
  console.error(`[Expo smoke] Missing simultaneous host isolation or lifecycle proof. Result: ${process.argv[3]}`);
  process.exit(1);
}
console.log(`[Expo smoke] PASS: ${labels.length * 3 + companionLabels.length} JavaScript assertions, public host reloads, two simultaneous hosts, and 4 creates / 4 destroys.`);
console.log(`[Expo smoke] Result: ${process.argv[3]}`);
JS
    then
      exit 0
    else
      RESULT_STATUS=$?
      if [ "$RESULT_STATUS" -ne 2 ]; then
        exit "$RESULT_STATUS"
      fi
    fi
  fi
  sleep 1
done
printf '[Expo smoke] Timed out after %s seconds waiting for a complete result at %s. Logs: %s\n' "$TIMEOUT_SECONDS" "$RESULT_FILE" "$LOG_ROOT" >&2
exit 1
