// @ts-check
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('@expo/config-plugins');

const PHASE_NAME = '[RNW] Bundle React Native (watchOS)';

/**
 * Adds a Run Script Build Phase to the watch target that, in Release
 * builds, invokes `expo export:embed --platform watchos` to produce a
 * minified JS bundle and writes it into the watch app's resources
 * (`Bundle.main`). In Debug builds the script no-ops so the dev-server
 * flow remains untouched.
 *
 * Registered as a `finalized` mod so it runs after @bacons/apple-targets
 * has created the watch target. The pbxproj is opened with `@bacons/xcode`
 * (resolved through apple-targets, so it's the same parser that wrote the
 * file) and written back with its serializer.
 *
 * @typedef {object} Opts
 * @property {string} targetName - Watch target name in pbxproj.
 * @property {string} [bundleName] - Output filename without extension.
 *   Defaults to `"main"` (→ `main.jsbundle`).
 * @property {string} [entryFile] - Path (relative to project root) of the
 *   JS entry. Defaults to auto-detecting `index.watchos.{tsx,ts,jsx,js}`.
 *   Required because `expo export:embed` resolves the entry from
 *   `package.json#main` and doesn't apply platform-suffix resolution at
 *   the entry-file level, so without an override it would bundle the iOS
 *   `index.js` (which pulls in `react-native` and crashes on
 *   `__fbBatchedBridgeConfig is not set`).
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {Opts} opts
 */
const withWatchBundleScript = (
  config,
  { targetName, bundleName = 'main', entryFile }
) => {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const {
        XcodeProject,
        PBXShellScriptBuildPhase,
        PBXSourcesBuildPhase,
        json,
      } = loadBaconsXcode(cfg.modRequest.projectRoot);
      const pbxprojPath = findPbxproj(cfg.modRequest.platformProjectRoot);
      const project = XcodeProject.open(pbxprojPath);

      const targets = project.rootObject.props.targets;
      const target = targets.find((t) => t.props.name === targetName);
      if (!target) {
        throw new Error(
          `[@appsent-co/react-native-watchos] Target "${targetName}" not found in pbxproj. ` +
            `Available: [${targets.map((t) => t.props.name).join(', ')}].`
        );
      }

      // Re-running `expo prebuild` without --clean must not duplicate the phase.
      const phases = target.props.buildPhases;
      if (
        phases.some(
          (p) => PBXShellScriptBuildPhase.is(p) && p.props.name === PHASE_NAME
        )
      ) {
        return cfg;
      }

      const phase = target.createBuildPhase(PBXShellScriptBuildPhase, {
        name: PHASE_NAME,
        shellPath: '/bin/sh',
        shellScript: buildScript({ bundleName, entryFile }),
        outputPaths: [
          `$(CONFIGURATION_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/${bundleName}.jsbundle`,
        ],
      });

      // createBuildPhase appends; move it right after Sources so a compile
      // error fails the build before we spend time bundling.
      phases.splice(phases.indexOf(phase), 1);
      const sourcesIdx = phases.findIndex((p) => PBXSourcesBuildPhase.is(p));
      phases.splice(sourcesIdx >= 0 ? sourcesIdx + 1 : phases.length, 0, phase);

      fs.writeFileSync(pbxprojPath, json.build(project.toJSON()));
      return cfg;
    },
  ]);
};

/**
 * Shell script body. Skips Debug (dev server handles those), cd's from
 * $PROJECT_DIR (ios/) to the project root (where package.json +
 * metro.config.js live), and writes the bundle straight into the .app's
 * resource folder.
 *
 * Xcode launches build phases with a minimal PATH that excludes
 * Homebrew/nvm. Source `.xcode.env(.local)` (the standard RN convention)
 * for NODE_BINARY, then prepend its directory to PATH so the `npx` shim
 * next to `node` is reachable.
 *
 * @param {{ bundleName: string, entryFile?: string }} opts
 */
function buildScript({ bundleName, entryFile }) {
  return [
    'set -e',
    'if [ "$CONFIGURATION" = "Debug" ]; then',
    '  echo "@appsent-co/react-native-watchos: skipping JS bundle for Debug"',
    '  exit 0',
    'fi',
    'if [ -f "$PROJECT_DIR/.xcode.env" ]; then',
    '  . "$PROJECT_DIR/.xcode.env"',
    'fi',
    'if [ -f "$PROJECT_DIR/.xcode.env.local" ]; then',
    '  . "$PROJECT_DIR/.xcode.env.local"',
    'fi',
    'if [ -z "$NODE_BINARY" ]; then',
    '  NODE_BINARY="$(command -v node || true)"',
    'fi',
    'if [ -z "$NODE_BINARY" ]; then',
    '  echo "error: NODE_BINARY not set and \\`node\\` not on PATH. ' +
      'Set NODE_BINARY in ios/.xcode.env(.local)." >&2',
    '  exit 1',
    'fi',
    'export PATH="$(dirname "$NODE_BINARY"):$PATH"',
    'cd "$PROJECT_DIR/.."',
    'DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"',
    'mkdir -p "$DEST"',
    // expo export:embed resolves entry from package.json#main with no
    // platform-suffix support, so we pass --entry-file ourselves.
    // Metro resolves --entry-file relative to its server root (the
    // pnpm workspace root in a monorepo), so use an absolute path to
    // avoid surprises.
    ...(entryFile
      ? [`ENTRY="$(pwd)/${entryFile}"`]
      : [
          'ENTRY=""',
          'for ext in tsx ts jsx js; do',
          '  if [ -f "index.watchos.$ext" ]; then',
          '    ENTRY="$(pwd)/index.watchos.$ext"',
          '    break',
          '  fi',
          'done',
          'if [ -z "$ENTRY" ]; then',
          '  echo "error: no index.watchos.{tsx,ts,jsx,js} found in $(pwd). ' +
            'Add one, or set entryFile in the @appsent-co/react-native-watchos plugin opts." >&2',
          '  exit 1',
          'fi',
        ]),
    'npx expo export:embed \\',
    '  --platform watchos \\',
    '  --entry-file "$ENTRY" \\',
    `  --bundle-output "$DEST/${bundleName}.jsbundle" \\`,
    '  --dev false \\',
    '  --minify true \\',
    '  --bytecode false \\',
    '  --assets-dest "$DEST"',
    // Pre-compile the JS bundle to Hermes bytecode (.hbc) so the watch
    // runtime skips parse+compile on every cold start. Bundle name on
    // disk stays `.jsbundle`; Hermes detects bytecode vs source from
    // the file's magic header. Uses the hermesc that ships with
    // react-native (matches the host Hermes version we link against).
    //
    // `require.resolve` handles pnpm/yarn-workspace hoisting — RN may
    // be in node_modules/ or hoisted to the workspace root.
    "HERMESC_BIN=\"$(\"$NODE_BINARY\" --print \"require('path').join(require('path').dirname(require.resolve('react-native/package.json')), 'sdks/hermesc/osx-bin/hermesc')\")\"",
    'if [ ! -x "$HERMESC_BIN" ]; then',
    '  echo "error: hermesc not found at $HERMESC_BIN" >&2',
    '  exit 1',
    'fi',
    `"$HERMESC_BIN" -emit-binary -out "$DEST/${bundleName}.hbc" "$DEST/${bundleName}.jsbundle"`,
    `mv "$DEST/${bundleName}.hbc" "$DEST/${bundleName}.jsbundle"`,
  ].join('\n');
}

/**
 * `@bacons/xcode` is a dependency of `@bacons/apple-targets`, not of this
 * package, and pnpm doesn't hoist it. Resolve it from apple-targets'
 * location so we get the exact instance that wrote the pbxproj.
 *
 * @param {string} projectRoot
 */
function loadBaconsXcode(projectRoot) {
  const appleTargetsDir = path.dirname(
    require.resolve('@bacons/apple-targets/package.json', {
      paths: [projectRoot],
    })
  );
  const resolve = (/** @type {string} */ id) =>
    require.resolve(id, { paths: [appleTargetsDir] });
  const {
    XcodeProject,
    PBXShellScriptBuildPhase,
    PBXSourcesBuildPhase,
  } = require(resolve('@bacons/xcode'));
  const json = require(resolve('@bacons/xcode/json'));
  return { XcodeProject, PBXShellScriptBuildPhase, PBXSourcesBuildPhase, json };
}

function findPbxproj(platformRoot) {
  const xcodeproj = fs
    .readdirSync(platformRoot)
    .find((name) => name.endsWith('.xcodeproj'));
  if (!xcodeproj) {
    throw new Error(
      `[@appsent-co/react-native-watchos] No .xcodeproj found in ${platformRoot}`
    );
  }
  return path.join(platformRoot, xcodeproj, 'project.pbxproj');
}

module.exports = withWatchBundleScript;
