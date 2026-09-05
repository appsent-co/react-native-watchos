// @ts-check
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;
const { withInfoPlist } = require('@expo/config-plugins');

const ACCESS_GROUP_KEY = 'RNWSecureStorageAccessGroup';
const PRIVATE_ACCESS_GROUP =
  '$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)';

/** Preserve the group SecItemAdd previously selected by default.
 * @param {Record<string, any> | undefined} entitlements
 * @returns {string}
 */
function defaultAccessGroup(entitlements) {
  const groups = entitlements?.['keychain-access-groups'];
  if (groups === undefined || (Array.isArray(groups) && groups.length === 0)) {
    return PRIVATE_ACCESS_GROUP;
  }
  if (!Array.isArray(groups) || typeof groups[0] !== 'string' || !groups[0]) {
    throw new Error(
      'Invalid keychain-access-groups: configure RNWSecureStorageAccessGroup explicitly.'
    );
  }
  // CFBundleIdentifier is a plist key, not a dependable Xcode build setting.
  return groups[0].replaceAll(
    '$(CFBundleIdentifier)',
    '$(PRODUCT_BUNDLE_IDENTIFIER)'
  );
}

/** @param {string} targetDir */
function watchAccessGroup(targetDir) {
  const jsonPath = path.join(targetDir, 'expo-target.config.json');
  if (fs.existsSync(jsonPath)) {
    const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (config.entitlements) return defaultAccessGroup(config.entitlements);
    const files = fs
      .readdirSync(targetDir)
      .filter((name) => name.endsWith('.entitlements'));
    if (files.length > 1) {
      throw new Error(
        `Multiple entitlements files in ${targetDir}; select one before configuring SecureStorage.`
      );
    }
    const entitlements =
      files.length === 1
        ? plist.parse(fs.readFileSync(path.join(targetDir, files[0]), 'utf8'))
        : undefined;
    return defaultAccessGroup(entitlements);
  }
  // Do not evaluate dynamic target config twice or guess its entitlements.
  console.warn(
    `Set ${ACCESS_GROUP_KEY} in ${path.join(targetDir, 'Info.plist')} to the target's existing default Keychain access group; automatic selection requires expo-target.config.json. SecureStorage will reject calls until configured.`
  );
  return null;
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withSecureStorage = (config) =>
  withInfoPlist(config, (cfg) => {
    if (!(ACCESS_GROUP_KEY in cfg.modResults)) {
      cfg.modResults[ACCESS_GROUP_KEY] = defaultAccessGroup(
        cfg.ios?.entitlements
      );
    }
    return cfg;
  });

module.exports = withSecureStorage;
module.exports.ACCESS_GROUP_KEY = ACCESS_GROUP_KEY;
module.exports.defaultAccessGroup = defaultAccessGroup;
module.exports.watchAccessGroup = watchAccessGroup;
