// @ts-check
const { withPlugins } = require('@expo/config-plugins');
const withSPMPackage = require('./withSPMPackage');
const withWatchAutolinking = require('./withWatchAutolinking');
const withWatchBundleScript = require('./withWatchBundleScript');
const withWatchTurboModuleCodegen = require('./withWatchTurboModuleCodegen');

/**
 * Expo Config Plugin for `@appsent-co/react-native-watchos`.
 *
 * Two pbxproj mods on the watch target that `@bacons/apple-targets`
 * creates during `expo prebuild`:
 *   1. `withSPMPackage` — wires the local Swift Package (Hermes + JSI host).
 *   2. `withWatchBundleScript` — adds a Release-only Run Script Build Phase
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
  const targetName = (opts && opts.targetName) || 'watch';
  const bundleName = (opts && opts.bundleName) || 'main';
  const entryFile = opts && opts.entryFile;
  const watchosDeploymentTarget = opts && opts.watchosDeploymentTarget;
  return withPlugins(config, [
    [withSPMPackage, { targetName }],
    // Run codegen BEFORE the bundle script so the generated sources are
    // wired into the watch target's pbxproj when Xcode opens it (the
    // bundle script is a separate Run Script phase that doesn't depend
    // on codegen output, but ordering keeps the diff readable).
    [withWatchTurboModuleCodegen, { targetName }],
    [withWatchAutolinking, { targetName, watchosDeploymentTarget }],
    [withWatchBundleScript, { targetName, bundleName, entryFile }],
  ]);
};

module.exports = withReactNativeWatchOS;
module.exports.default = withReactNativeWatchOS;
