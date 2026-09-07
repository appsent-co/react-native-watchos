const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  versions,
  resolveCompatibility,
  resolveNativeBuild,
} = require('../expo-modules/compatibility.cjs');

function fixture(t, expoVersion) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rnw-expo-compatibility-')
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function pkg(name, version) {
    const directory = path.join(root, 'node_modules', name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ name, version })
    );
  }
  pkg('react-native', versions['react-native']);
  pkg('react', versions.react);
  const hermes = path.join(
    root,
    'node_modules/react-native/sdks/.hermesv1version'
  );
  fs.mkdirSync(path.dirname(hermes));
  fs.writeFileSync(hermes, versions.hermes);
  if (expoVersion) pkg('expo', expoVersion);
  return { root, pkg, hermes };
}

test('each supported Expo patch works without app Core or JSI sources', (t) => {
  for (const version of ['57.0.19', '57.0.20']) {
    const app = fixture(t, version);
    const packages = resolveCompatibility(app.root);
    assert.equal(packages.expo.version, version);
    assert.equal(packages['react-native'].version, versions['react-native']);
  }
});

test('native builds only depend on the pinned React Native runtime', (t) => {
  const app = fixture(t);
  assert.equal(
    resolveNativeBuild(app.root)['react-native'].version,
    versions['react-native']
  );
});

test('untested Expo releases and prereleases fail clearly', (t) => {
  for (const version of [
    '56.0.9',
    '57.0.18',
    '57.0.21',
    '57.0.20-canary.1',
    '58.0.0',
  ]) {
    const app = fixture(t, version);
    assert.throws(
      () => resolveCompatibility(app.root),
      /outside the tested range/
    );
  }
});

test('consumer and build checks retain React Native and Hermes ABI constraints', (t) => {
  const app = fixture(t, '57.0.20');
  app.pkg('react-native', '0.86.4');
  assert.throws(
    () => resolveCompatibility(app.root),
    /react-native must be 0.86.3/
  );
  app.pkg('react-native', versions['react-native']);
  app.pkg('react', '19.2.4');
  assert.throws(() => resolveNativeBuild(app.root), /react must be 19.2.3/);
  app.pkg('react', versions.react);
  fs.writeFileSync(app.hermes, 'different-hermes');
  assert.throws(() => resolveCompatibility(app.root), /Expected Hermes/);
});
