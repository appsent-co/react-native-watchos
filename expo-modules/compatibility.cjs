const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const semver = require('semver');
const versions = require('./versions.json');
const expoRange = require('../package.json').peerDependencies.expo;

function resolver(projectRoot) {
  const appRequire = createRequire(
    path.join(path.resolve(projectRoot), 'package.json')
  );
  return (name) => {
    const file = appRequire.resolve(`${name}/package.json`);
    return {
      version: JSON.parse(fs.readFileSync(file, 'utf8')).version,
      root: path.dirname(file),
    };
  };
}

// These packages supply the renderer and JSI ABI used by the shipped binaries.
// The app does not select our Expo native sources; prepare.cjs pins those
// independently when maintainers build the package.
function resolveNativeBuild(projectRoot) {
  const resolve = resolver(projectRoot);
  const packages = {};
  for (const name of ['react-native', 'react']) {
    const pkg = resolve(name);
    if (pkg.version !== versions[name])
      throw new Error(
        `[RNW Expo modules] ${name} must be ${versions[name]}; found ${pkg.version}. The shipped watch runtime is built against this React Native/React pair.`
      );
    packages[name] = pkg;
  }
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

function resolveCompatibility(projectRoot) {
  const expo = resolver(projectRoot)('expo');
  if (!semver.satisfies(expo.version, expoRange))
    throw new Error(
      `[RNW Expo modules] Expo ${expo.version} is outside the tested range ${expoRange}.`
    );
  return { expo, ...resolveNativeBuild(projectRoot) };
}
module.exports = {
  versions,
  resolveCompatibility,
  resolveNativeBuild,
};
