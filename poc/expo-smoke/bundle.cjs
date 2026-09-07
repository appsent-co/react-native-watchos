#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { withWatchosMetro } = require('../../metro-config');

const root = path.resolve(__dirname, '../..');
const expoRequire = createRequire(
  require.resolve('expo/package.json', { paths: [root] })
);
const { getDefaultConfig } = expoRequire('@expo/metro-config');
const { runBuild } = expoRequire('@expo/metro/metro');
const config = withWatchosMetro(getDefaultConfig(root));
config.watchFolders = [...new Set([root, ...config.watchFolders])];
config.maxWorkers = 2;
config.resolver.useWatchman = false;
const output = path.join(root, 'build/poc/expo-smoke/smoke.jsbundle');
fs.mkdirSync(path.dirname(output), { recursive: true });
runBuild(config, {
  entry: path.join(__dirname, 'smoke.ts'),
  platform: 'watchos',
  dev: false,
  minify: false,
  bundleOut: output,
})
  .then(() => {
    if (!fs.statSync(output).size)
      throw new Error('Metro emitted an empty smoke bundle');
    console.log(`Metro watchOS smoke bundle: ${output}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
