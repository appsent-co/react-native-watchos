// @ts-check
const { withPlugins } = require('@expo/config-plugins');
const withWatchAutolinking = require('./withWatchAutolinking');
const withWatchBundleScript = require('./withWatchBundleScript');
const withWatchTurboModuleCodegen = require('./withWatchTurboModuleCodegen');

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
 *   { "type": "watch" }
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
    // Run codegen BEFORE the bundle script so the generated sources are
    // wired into the watch target's pbxproj when Xcode opens it (the
    // bundle script is a separate Run Script phase that doesn't depend
    // on codegen output, but ordering keeps the diff readable).
    [withWatchTurboModuleCodegen, { targetName }],
    [withWatchAutolinking, { targetName, watchosDeploymentTarget }],
    [withWatchBundleScript, { targetName, bundleName, entryFile }],
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
