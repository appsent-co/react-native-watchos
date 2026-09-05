// @ts-check
const { withPlugins } = require('@expo/config-plugins');
const withWatchAutolinking = require('./withWatchAutolinking');
const withWatchBundleScript = require('./withWatchBundleScript');
const withWatchTurboModuleCodegen = require('./withWatchTurboModuleCodegen');
const withWatchInfoPlist = require('./withWatchInfoPlist');
const withWatchTargetConfig = require('./withWatchTargetConfig');
const withSecureStorage = require('./withSecureStorage');

/**
 * Expo Config Plugin for `@appsent-co/react-native-watchos`.
 *
 * Mods applied to the watch target that `@bacons/apple-targets` creates
 * during `expo prebuild`:
 *   1. `withWatchTurboModuleCodegen` — runs RN codegen for the watch target
 *      so generated TurboModule specs are wired into the pbxproj.
 *   2. `withWatchAutolinking` — writes `targets/<name>/pods.rb` so the
 *      runtime (`ReactNativeWatchOS` + `ReactNativeWatchOSCxx`, embedding
 *      Hermes) and every `:watchos`-declared third-party RN module link into
 *      the watch target via CocoaPods.
 *   3. `withWatchBundleScript` — adds a Release-only Run Script Build Phase
 *      that invokes `expo export:embed --platform watchos` and writes
 *      `main.jsbundle` into the watch app's resources.
 *   4. `withWatchInfoPlist` — adds the keys the runtime's DEBUG path reads
 *      to `targets/<name>/Info.plist` when they are missing:
 *      `RNWDevServerHost` / `RNWDevServerPort` (= `$(RNW_DEV_SERVER_HOST)` /
 *      `$(RNW_DEV_SERVER_PORT)`, so the Metro endpoint is an xcodebuild
 *      argument), the `NSAllowsLocalNetworking` ATS exception (plain-http
 *      bundle fetch from a physical watch) and `NSMotionUsageDescription`
 *      (shake-to-open dev menu). Also pins RNWSecureStorageAccessGroup
 *      in the watch and iOS Info.plists to their existing default groups.
 *   5. `withWatchTargetConfig` — adds `"entitlements": {}` to
 *      `targets/<name>/expo-target.config.json` when the key is missing, so
 *      the simulator's Keychain (the `SecureStorage` module) works.
 *
 * Recommended app.json:
 *
 *   {
 *     "expo": {
 *       "plugins": [
 *         "@bacons/apple-targets",
 *         ["@appsent-co/react-native-watchos", { "targetName": "watch" }]
 *       ]
 *     }
 *   }
 *
 * And `targets/watch/expo-target.config.json`:
 *
 *   { "type": "watch", "entitlements": {} }
 *
 * Order matters: `@bacons/apple-targets` MUST run before this plugin so the
 * watch target exists in the pbxproj when we look it up.
 *
 * @typedef {object} ReactNativeWatchOSPluginOpts
 * @property {string} [targetName] - Name of the watch target in pbxproj.
 *   Matches `@bacons/apple-targets`' directory-derived name. Defaults to
 *   `"watch"`.
 * @property {string} [bundleName] - Output JS bundle filename (without
 *   extension). Defaults to `"main"` (→ `main.jsbundle`).
 * @property {string} [entryFile] - Path (relative to project root) of the
 *   JS entry. Defaults to auto-detecting `index.watchos.{tsx,ts,jsx,js}`
 *   at build time.
 * @property {string} [watchosDeploymentTarget] - Minimum watchOS version
 *   advertised to CocoaPods autolinking. Defaults to `"9.0"`, matching
 *   `WATCHOS_DEPLOYMENT_TARGET` in `scripts/build-xcframework.sh`.
 *
 * @type {import('@expo/config-plugins').ConfigPlugin<ReactNativeWatchOSPluginOpts | void>}
 */
const withReactNativeWatchOS = (config, opts) => {
  assertPluginOrder(config);
  const targetName = (opts && opts.targetName) || 'watch';
  const bundleName = (opts && opts.bundleName) || 'main';
  const entryFile = opts && opts.entryFile;
  const watchosDeploymentTarget = opts && opts.watchosDeploymentTarget;
  return withPlugins(config, [
    withSecureStorage,
    // Run codegen BEFORE the bundle script so the generated sources are
    // wired into the watch target's pbxproj when Xcode opens it (the
    // bundle script is a separate Run Script phase that doesn't depend
    // on codegen output, but ordering keeps the diff readable).
    [withWatchTurboModuleCodegen, { targetName }],
    [withWatchAutolinking, { targetName, watchosDeploymentTarget }],
    [withWatchBundleScript, { targetName, bundleName, entryFile }],
    [withWatchInfoPlist, { targetName }],
    [withWatchTargetConfig, { targetName }],
  ]);
};

/**
 * @param {{ plugins?: Array<string | [string, unknown] | unknown> }} config
 */
function assertPluginOrder(config) {
  const plugins = Array.isArray(config && config.plugins)
    ? config.plugins
    : null;
  if (!plugins) return;

  /** @param {unknown} e */
  const nameOf = (e) =>
    typeof e === 'string' ? e : Array.isArray(e) ? e[0] : null;
  const ourIdx = plugins.findIndex(
    (e) => nameOf(e) === '@appsent-co/react-native-watchos'
  );
  const baconsIdx = plugins.findIndex(
    (e) => nameOf(e) === '@bacons/apple-targets'
  );
  if (ourIdx < 0) return;

  if (baconsIdx < 0) {
    throw new Error(
      '[@appsent-co/react-native-watchos] requires "@bacons/apple-targets" ' +
        'to be present in your Expo plugins array (before this plugin). ' +
        'Run `npx react-native-watchos init` to wire it up.'
    );
  }
  if (baconsIdx > ourIdx) {
    throw new Error(
      '[@appsent-co/react-native-watchos] must come AFTER ' +
        '"@bacons/apple-targets" in your Expo plugins array, so the watch ' +
        'target exists when this plugin patches the pbxproj. ' +
        'Run `npx react-native-watchos init` to fix the order.'
    );
  }
}

module.exports = withReactNativeWatchOS;
module.exports.default = withReactNativeWatchOS;
