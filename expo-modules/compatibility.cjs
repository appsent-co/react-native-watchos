const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const versions = require('./versions.json');

function resolveCompatibility(projectRoot) {
  const appRequire = createRequire(
    path.join(path.resolve(projectRoot), 'package.json')
  );
  const packages = {};
  function resolve(name, from = appRequire) {
    const file = from.resolve(`${name}/package.json`);
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    packages[name] = { version: pkg.version, root: path.dirname(file) };
    if (pkg.version !== versions[name]) {
      throw new Error(
        `[RNW Expo modules] ${name} must be ${versions[name]}; found ${pkg.version}. This watch runtime supports the versions in expo-modules/versions.json. Align your dependencies and reinstall before prebuild.`
      );
    }
    return createRequire(file);
  }
  const expoRequire = resolve('expo');
  const coreRequire = resolve('expo-modules-core', expoRequire);
  resolve('expo-modules-jsi', coreRequire);
  resolve('react-native');
  resolve('react');
  const hermes = fs
    .readFileSync(
      path.join(packages['react-native'].root, 'sdks/.hermesv1version'),
      'utf8'
    )
    .trim();
  if (hermes !== versions.hermes)
    throw new Error(
      `[RNW Expo modules] Expected Hermes ${versions.hermes}; found ${hermes}. Rebuild against the supported React Native release.`
    );
  return packages;
}
module.exports = { versions, resolveCompatibility };
