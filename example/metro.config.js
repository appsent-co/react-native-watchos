const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withWatchosMetro } = require('@appsent-co/react-native-watchos/metro-config');

const config = getDefaultConfig(__dirname);

// Workspace root (one level up — the @appsent-co/react-native-watchos package itself).
// Metro by default only watches files under `projectRoot` (= this dir).
// Without this, files in ../src/ and the symlink target of
// node_modules/@appsent-co/react-native-watchos/ are invisible to the resolver, so
// imports like `@appsent-co/react-native-watchos/renderer` fail to bundle.
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [workspaceRoot];

// pnpm hoists deps to the workspace root's node_modules. Tell Metro to
// look there as well as in example/node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withWatchosMetro(config);
