// @ts-check
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * Info.plist keys the runtime reads from the watch target. They mirror
 * `ReactNativeWatchOSHost.devServerHostInfoKey` / `devServerPortInfoKey`
 * in `apple/Sources/ReactNativeWatchOS/ReactNativeWatchOS.swift`.
 */
const DEV_SERVER_HOST_KEY = 'RNWDevServerHost';
const DEV_SERVER_PORT_KEY = 'RNWDevServerPort';

/**
 * Build settings the keys expand from. Unset settings expand to "" and the
 * runtime then falls back to `127.0.0.1:8081`, so the endpoint becomes an
 * `xcodebuild` argument (`RNW_DEV_SERVER_PORT=8082`,
 * `RNW_DEV_SERVER_HOST=<Mac LAN IP>`) or an xcconfig line.
 */
const DEV_SERVER_HOST_SETTING = 'RNW_DEV_SERVER_HOST';
const DEV_SERVER_PORT_SETTING = 'RNW_DEV_SERVER_PORT';

const MOTION_USAGE_DESCRIPTION =
  'Detects a shake gesture to open the dev menu.';

/**
 * Ensures `targets/<name>/Info.plist` carries everything the runtime's
 * DEBUG path needs. Every key is only added when absent so a user's own
 * values always win:
 *
 *   - `RNWDevServerHost` / `RNWDevServerPort` = `$(RNW_DEV_SERVER_HOST)` /
 *     `$(RNW_DEV_SERVER_PORT)` — read by `defaultBundleURL()` when the
 *     caller passes no explicit `host:`/`port:`.
 *   - `NSAppTransportSecurity.NSAllowsLocalNetworking = true` — the DEBUG
 *     bundle URL is plain `http://`; the simulator's `127.0.0.1` is loopback
 *     and exempt, but a physical watch reaching the Mac's LAN IP is refused
 *     by App Transport Security without this. It only opens RFC1918 / `.local`
 *     hosts, not arbitrary cleartext.
 *   - `NSMotionUsageDescription` — required by the shake-to-open-dev-menu
 *     gesture the template `ContentView.swift` relies on.
 *
 * Shared by the config plugin (runs on every `expo prebuild`) and
 * `npx react-native-watchos init` (so the keys are visible in the scaffolded
 * source before the first prebuild).
 *
 * @param {string} targetDir - Absolute path of `targets/<name>/`.
 * @returns {{ path: string, added: string[] }} The plist path and the keys
 *   that were added (empty when the file was already complete).
 */
function ensureWatchInfoPlist(targetDir) {
  const plistPath = path.join(targetDir, 'Info.plist');

  /** @type {Record<string, any>} */
  let dict = {};
  if (fs.existsSync(plistPath)) {
    const parsed = plist.parse(fs.readFileSync(plistPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `[@appsent-co/react-native-watchos] ${plistPath} is not a plist dictionary.`
      );
    }
    dict = parsed;
  }

  /** @type {string[]} */
  const added = [];

  if (!(DEV_SERVER_HOST_KEY in dict)) {
    dict[DEV_SERVER_HOST_KEY] = `$(${DEV_SERVER_HOST_SETTING})`;
    added.push(DEV_SERVER_HOST_KEY);
  }
  if (!(DEV_SERVER_PORT_KEY in dict)) {
    dict[DEV_SERVER_PORT_KEY] = `$(${DEV_SERVER_PORT_SETTING})`;
    added.push(DEV_SERVER_PORT_KEY);
  }

  const ats = dict.NSAppTransportSecurity;
  if (ats == null) {
    dict.NSAppTransportSecurity = { NSAllowsLocalNetworking: true };
    added.push('NSAppTransportSecurity.NSAllowsLocalNetworking');
  } else if (
    typeof ats === 'object' &&
    !Array.isArray(ats) &&
    !('NSAllowsLocalNetworking' in ats) &&
    // An app that already allows arbitrary loads doesn't need the narrower
    // exception (and Apple rejects the two side by side in review notes).
    ats.NSAllowsArbitraryLoads !== true
  ) {
    ats.NSAllowsLocalNetworking = true;
    added.push('NSAppTransportSecurity.NSAllowsLocalNetworking');
  }

  if (!('NSMotionUsageDescription' in dict)) {
    dict.NSMotionUsageDescription = MOTION_USAGE_DESCRIPTION;
    added.push('NSMotionUsageDescription');
  }

  if (added.length > 0 || !fs.existsSync(plistPath)) {
    fs.writeFileSync(plistPath, plist.build(dict) + '\n');
  }
  return { path: plistPath, added };
}

/**
 * Config plugin wrapper around {@link ensureWatchInfoPlist}. Runs as a
 * dangerous mod because the file lives in `targets/<name>/` (source, not
 * `ios/`), which is where `@bacons/apple-targets` points the watch target's
 * `INFOPLIST_FILE`.
 *
 * @typedef {object} Opts
 * @property {string} targetName - Watch target name; matches the
 *   `targets/<targetName>/` directory.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {Opts} opts
 */
const withWatchInfoPlist = (config, { targetName }) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const targetDir = path.join(projectRoot, 'targets', targetName);
      if (!fs.existsSync(targetDir)) {
        // Same policy as withWatchAutolinking: a missing target dir is
        // reported by other plugins in the chain.
        return cfg;
      }
      const { path: plistPath, added } = ensureWatchInfoPlist(targetDir);
      if (added.length > 0) {
        console.log(
          `[@appsent-co/react-native-watchos] Added ${added.join(', ')} to ${path.relative(projectRoot, plistPath)}`
        );
      }
      return cfg;
    },
  ]);
};

module.exports = withWatchInfoPlist;
module.exports.ensureWatchInfoPlist = ensureWatchInfoPlist;
module.exports.DEV_SERVER_HOST_KEY = DEV_SERVER_HOST_KEY;
module.exports.DEV_SERVER_PORT_KEY = DEV_SERVER_PORT_KEY;
module.exports.DEV_SERVER_HOST_SETTING = DEV_SERVER_HOST_SETTING;
module.exports.DEV_SERVER_PORT_SETTING = DEV_SERVER_PORT_SETTING;
