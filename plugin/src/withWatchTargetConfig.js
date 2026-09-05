// @ts-check
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const TARGET_CONFIG_JSON = 'expo-target.config.json';

/**
 * Ensures `targets/<name>/expo-target.config.json` declares an
 * `entitlements` object, so `@bacons/apple-targets` gives the watch target
 * a `CODE_SIGN_ENTITLEMENTS` file. The simulator's Keychain requires an
 * `application-identifier` entitlement, which Xcode only synthesises for an
 * ad-hoc signed build when that file exists; without it every `SecItem*`
 * call fails with `OSStatus -34018`. An empty object is enough.
 *
 * Only the JSON form is handled, and a file that already has an
 * `entitlements` key is never touched. Shared by the config plugin and
 * `npx react-native-watchos init`: `@bacons/apple-targets` reads the target
 * config before any mod runs, so a key added by the plugin applies on the
 * next `expo prebuild`, while `init` writes it before the first one.
 *
 * @param {string} targetDir - Absolute path of `targets/<name>/`.
 * @returns {{ path: string | null, added: boolean }}
 */
function ensureWatchTargetEntitlements(targetDir) {
  const configPath = path.join(targetDir, TARGET_CONFIG_JSON);
  if (!fs.existsSync(configPath)) return { path: null, added: false };

  /** @type {Record<string, unknown>} */
  let json;
  try {
    json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(
      `[@appsent-co/react-native-watchos] ${configPath} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(
      `[@appsent-co/react-native-watchos] ${configPath} is not a JSON object.`
    );
  }
  if ('entitlements' in json) return { path: configPath, added: false };
  // apple-targets already uses an existing entitlements file. Adding an empty
  // config object would replace it and could remove a legacy shared group.
  if (
    fs.readdirSync(targetDir).some((name) => name.endsWith('.entitlements'))
  ) {
    return { path: configPath, added: false };
  }

  json.entitlements = {};
  fs.writeFileSync(configPath, JSON.stringify(json, null, 2) + '\n');
  return { path: configPath, added: true };
}

/**
 * @typedef {object} Opts
 * @property {string} targetName - Watch target name; matches the
 *   `targets/<targetName>/` directory.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {Opts} opts
 */
const withWatchTargetConfig = (config, { targetName }) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const targetDir = path.join(projectRoot, 'targets', targetName);
      if (!fs.existsSync(targetDir)) {
        return cfg;
      }
      const { path: configPath, added } =
        ensureWatchTargetEntitlements(targetDir);
      if (added && configPath) {
        console.log(
          `[@appsent-co/react-native-watchos] Added "entitlements": {} to ${path.relative(projectRoot, configPath)} ` +
            '(the simulator Keychain needs an entitlements file). ' +
            '@bacons/apple-targets reads this file before mods run, so run `expo prebuild` once more for it to apply.'
        );
      }
      return cfg;
    },
  ]);
};

module.exports = withWatchTargetConfig;
module.exports.ensureWatchTargetEntitlements = ensureWatchTargetEntitlements;
module.exports.TARGET_CONFIG_JSON = TARGET_CONFIG_JSON;
