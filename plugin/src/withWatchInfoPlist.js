// @ts-check
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;
const { withDangerousMod } = require('@expo/config-plugins');
const { ACCESS_GROUP_KEY, watchAccessGroup } = require('./withSecureStorage');

// Read by `ReactNativeWatchOSHost.defaultBundleURL()`; mirror the keys in
// `apple/Sources/ReactNativeWatchOS/ReactNativeWatchOS.swift`.
const DEV_SERVER_HOST_KEY = 'RNWDevServerHost';
const DEV_SERVER_PORT_KEY = 'RNWDevServerPort';

// Build settings the keys expand from. Unset, they expand to "" and the
// runtime falls back to `127.0.0.1:8081`.
const DEV_SERVER_HOST_SETTING = 'RNW_DEV_SERVER_HOST';
const DEV_SERVER_PORT_SETTING = 'RNW_DEV_SERVER_PORT';

const MOTION_USAGE_DESCRIPTION =
  'Detects a shake gesture to open the dev menu.';

/**
 * Ensures `targets/<name>/Info.plist` carries what the runtime's DEBUG path
 * needs, adding each key only when absent: the dev-server keys,
 * `NSAllowsLocalNetworking` (a physical watch fetching the bundle from the
 * Mac's LAN IP over plain http) and `NSMotionUsageDescription` (the
 * shake-to-open dev menu). Shared by the config plugin and
 * `npx react-native-watchos init`.
 *
 * @param {string} targetDir - Absolute path of `targets/<name>/`.
 * @returns {{ path: string, added: string[] }}
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

  if (!(ACCESS_GROUP_KEY in dict)) {
    const group = watchAccessGroup(targetDir);
    if (group !== null) {
      dict[ACCESS_GROUP_KEY] = group;
      added.push(ACCESS_GROUP_KEY);
    }
  }

  const ats = dict.NSAppTransportSecurity;
  if (ats == null) {
    dict.NSAppTransportSecurity = { NSAllowsLocalNetworking: true };
    added.push('NSAppTransportSecurity.NSAllowsLocalNetworking');
  } else if (
    typeof ats === 'object' &&
    !Array.isArray(ats) &&
    !('NSAllowsLocalNetworking' in ats) &&
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
 * A dangerous mod because the file lives in `targets/<name>/`, not `ios/`.
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
