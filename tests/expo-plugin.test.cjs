const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const xcode = require('xcode');
const plist = require('@expo/plist').default;

const {
  configurePlist,
  configureProject,
  deploymentTarget,
  resolveEnabled,
} = require('../plugin/src/withWatchExpoModules');
const { withWatchosMetro } = require('../plugin/src/withWatchosMetro');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_PROJECT = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'watch-project.xcodeproj',
  'project.pbxproj'
);

function loadProject(projectFile) {
  const project = xcode.project(projectFile);
  project.parseSync();
  return project;
}

function targetSettings(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  const id = Object.keys(targets).find(
    (key) => !key.endsWith('_comment') && targets[key].name === targetName
  );
  const list =
    project.hash.project.objects.XCConfigurationList[
      targets[id].buildConfigurationList
    ];
  return list.buildConfigurations.map((ref) => ({
    id: ref.value,
    settings: project.pbxXCBuildConfigurationSection()[ref.value].buildSettings,
  }));
}

function projectFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-plugin-'));
  const platformRoot = path.join(root, 'ios');
  const projectDir = path.join(platformRoot, 'watchosexample.xcodeproj');
  fs.mkdirSync(projectDir, { recursive: true });
  const projectFile = path.join(projectDir, 'project.pbxproj');
  fs.copyFileSync(FIXTURE_PROJECT, projectFile);
  return { root, platformRoot, projectFile };
}

function cleanup(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

test('Expo detection uses the app dependency graph even without watch modules', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-detection-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const appRoot = path.join(root, 'apps', 'watch-app');
  fs.mkdirSync(appRoot, { recursive: true });
  assert.equal(resolveEnabled(appRoot), false);
  const expoRoot = path.join(root, 'node_modules', 'expo');
  fs.mkdirSync(expoRoot, { recursive: true });
  fs.writeFileSync(
    path.join(expoRoot, 'package.json'),
    JSON.stringify({ name: 'expo', version: '57.0.20' })
  );
  assert.equal(resolveEnabled(root), true);
  assert.equal(resolveEnabled(appRoot), true, 'hoisted Expo is detected');
  assert.equal(resolveEnabled(appRoot, false), false, 'opt-out takes priority');
});

test('explicit Expo options override detection and reject invalid values', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-option-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(resolveEnabled(root, true), true);
  assert.equal(resolveEnabled(root, false), false);
  assert.equal(resolveEnabled(root, null), false);
  for (const value of ['true', 'false', 0, 1, {}]) {
    assert.throws(() => resolveEnabled(root, value), /must be true or false/);
  }
});

test('Expo detection propagates a broken package instead of silently disabling it', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-broken-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const expoRoot = path.join(root, 'node_modules', 'expo');
  fs.mkdirSync(expoRoot, { recursive: true });
  fs.writeFileSync(path.join(expoRoot, 'package.json'), '{ invalid json');
  assert.throws(() => resolveEnabled(root), {
    code: 'ERR_INVALID_PACKAGE_CONFIG',
  });
  assert.equal(resolveEnabled(root, false), false);
});

test('deployment target validates before project mutation', () => {
  assert.equal(deploymentTarget(undefined, false), '9.0');
  assert.equal(deploymentTarget(undefined, true), '9.4');
  assert.equal(deploymentTarget('11.2', true), '11.2');
  assert.throws(() => deploymentTarget('9.3', true), /require watchOS 9.4/);
  assert.throws(
    () => deploymentTarget('not-a-version', true),
    /version string/
  );
});

test('configureProject adds exactly one provider to only the watch target and preserves higher settings', () => {
  const fixture = projectFixture();
  try {
    const provider = path.join(
      fixture.platformRoot,
      'build',
      'generated',
      'rnw-expo',
      'watch',
      'RNWExpoModulesProvider.swift'
    );
    fs.mkdirSync(path.dirname(provider), { recursive: true });
    fs.writeFileSync(provider, '// generated\n');

    const project = loadProject(fixture.projectFile);
    const companionBefore = JSON.parse(
      JSON.stringify(
        targetSettings(project, 'watchosexample').map((entry) => entry.settings)
      )
    );
    const watchBefore = targetSettings(project, 'watch');
    watchBefore[0].settings.WATCHOS_DEPLOYMENT_TARGET = '9.0';
    watchBefore[1].settings.WATCHOS_DEPLOYMENT_TARGET = '11.0';

    const options = {
      platformRoot: fixture.platformRoot,
      targetName: 'watch',
      providerFile: provider,
      enabled: true,
      minimumVersion: '9.4',
    };
    configureProject(project, options);
    configureProject(project, options);
    fs.writeFileSync(fixture.projectFile, project.writeSync());

    const reparsed = loadProject(fixture.projectFile);
    const relative = path.relative(fixture.platformRoot, provider);
    assert.ok(reparsed.hasFile(relative));
    const fileReferences = reparsed.pbxFileReferenceSection();
    const providerRef = Object.entries(fileReferences).find(
      ([key, entry]) =>
        !key.endsWith('_comment') &&
        String(entry.path).replace(/^"|"$/g, '') === relative
    );
    assert.ok(providerRef, 'provider must have a PBX file reference');
    const buildFiles = Object.entries(reparsed.pbxBuildFileSection()).filter(
      ([key, entry]) =>
        !key.endsWith('_comment') && entry.fileRef?.startsWith(providerRef[0])
    );
    assert.equal(
      buildFiles.length,
      1,
      'provider must not be duplicated by a second plugin run'
    );
    const watchSettings = targetSettings(reparsed, 'watch');
    assert.equal(watchSettings[0].settings.WATCHOS_DEPLOYMENT_TARGET, '9.4');
    assert.equal(watchSettings[1].settings.WATCHOS_DEPLOYMENT_TARGET, '11.0');
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          targetSettings(reparsed, 'watchosexample').map(
            (entry) => entry.settings
          )
        )
      ),
      companionBefore
    );

    configureProject(reparsed, { ...options, enabled: false });
    fs.writeFileSync(fixture.projectFile, reparsed.writeSync());
    const disabled = loadProject(fixture.projectFile);
    assert.equal(disabled.hasFile(relative), false);
  } finally {
    cleanup(fixture);
  }
});

test('configurePlist only owns its factory value and reversibly removes it', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-plist-'));
  const file = path.join(root, 'Info.plist');
  try {
    fs.writeFileSync(file, plist.build({ CFBundleName: 'Fixture' }) + '\n');
    configurePlist(file, true);
    assert.equal(
      plist.parse(fs.readFileSync(file, 'utf8')).RNWRuntimeBindingFactory,
      'RNWExpoRuntimeBindingFactory'
    );
    configurePlist(file, false);
    assert.equal(
      Object.hasOwn(
        plist.parse(fs.readFileSync(file, 'utf8')),
        'RNWRuntimeBindingFactory'
      ),
      false
    );

    fs.writeFileSync(
      file,
      plist.build({ RNWRuntimeBindingFactory: 'CompanionFactory' }) + '\n'
    );
    assert.throws(
      () => configurePlist(file, true),
      /another RNWRuntimeBindingFactory/
    );
    assert.equal(
      plist.parse(fs.readFileSync(file, 'utf8')).RNWRuntimeBindingFactory,
      'CompanionFactory'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Metro aliases expo-modules-core only for watchOS and delegates iOS unchanged', () => {
  const calls = [];
  const terminal = (context, name, platform) => {
    calls.push({ context, name, platform });
    return { type: 'sourceFile', filePath: '/terminal.js' };
  };
  const config = withWatchosMetro({ resolver: { platforms: ['ios'] } });
  const context = {
    resolveRequest: terminal,
    sourceExts: ['ts'],
    preferNativePlatform: true,
  };
  const watch = config.resolver.resolveRequest(
    context,
    'expo-modules-core',
    'watchos'
  );
  assert.equal(watch.type, 'sourceFile');
  assert.match(watch.filePath, /src\/expoModules\.ts$/);
  assert.equal(calls.length, 0);
  assert.deepEqual(
    config.resolver.resolveRequest(context, 'expo-modules-core', 'ios'),
    { type: 'sourceFile', filePath: '/terminal.js' }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].platform, 'ios');
});
