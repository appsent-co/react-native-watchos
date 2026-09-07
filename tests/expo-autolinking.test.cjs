const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  discoverModules,
  renderProvider,
  writeProvider,
} = require('../expo-modules/autolinking.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const AUTOLINKER = path.join(REPO_ROOT, 'expo-modules', 'autolinking.cjs');

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function installedPackage(name) {
  return path.dirname(
    require.resolve(name + '/package.json', { paths: [REPO_ROOT] })
  );
}

function moduleConfig(
  moduleClass,
  swiftModuleName,
  podspecPath = 'ios/Module.podspec'
) {
  return {
    platforms: ['watchos'],
    watchos: {
      modules: [moduleClass],
      podspecPath,
      swiftModuleName,
    },
  };
}

function createFixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-autolinking-'));
  const dependencies = {
    'expo': '57.0.20',
    'react': '19.2.3',
    'react-native': '0.86.3',
    ...(options.dependencies || {}),
  };
  const app = {
    name: 'autolinking-fixture',
    version: '1.0.0',
    dependencies,
    expo: {
      autolinking: {
        watchos: options.autolinking || {},
      },
    },
  };
  write(path.join(root, 'package.json'), JSON.stringify(app, null, 2));
  for (const name of ['expo', 'react', 'react-native']) {
    const destination = path.join(root, 'node_modules', name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(installedPackage(name), destination, 'dir');
  }

  function addModule(name, config, moduleOptions = {}) {
    const directory =
      moduleOptions.directory ||
      path.join(root, 'node_modules', ...name.split('/'));
    const pkg = {
      name,
      version: moduleOptions.version || '1.0.0',
      dependencies: moduleOptions.dependencies || {},
    };
    write(path.join(directory, 'package.json'), JSON.stringify(pkg, null, 2));
    if (config) {
      write(
        path.join(directory, 'expo-module.config.json'),
        JSON.stringify(config, null, 2)
      );
      const podspec = config.watchos && config.watchos.podspecPath;
      if (typeof podspec === 'string' && !podspec.includes('..')) {
        write(path.join(directory, podspec), 'Pod::Spec.new do |s| end\n');
      }
    }
    return directory;
  }

  function updateApp(mutator) {
    const packagePath = path.join(root, 'package.json');
    const current = readJson(packagePath);
    mutator(current);
    write(packagePath, JSON.stringify(current, null, 2));
  }

  return { root, addModule, updateApp };
}

function removeFixture(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

test('uses SDK57 search for literal watchOS modules, transitive modules, and exclusions', () => {
  const fixture = createFixture({
    dependencies: {
      'direct-module': '1.0.0',
      'parent-module': '1.0.0',
      'excluded-module': '1.0.0',
    },
    autolinking: { exclude: ['excluded-module'] },
  });
  try {
    const direct = fixture.addModule(
      'direct-module',
      moduleConfig('DirectModule', 'DirectPod')
    );
    const parent = fixture.addModule('parent-module', null, {
      dependencies: { 'transitive-module': '1.0.0' },
    });
    const transitive = fixture.addModule(
      'transitive-module',
      moduleConfig('TransitiveModule', 'TransitivePod'),
      { directory: path.join(parent, 'node_modules', 'transitive-module') }
    );
    fixture.addModule(
      'excluded-module',
      moduleConfig('ExcludedModule', 'ExcludedPod')
    );

    const modules = discoverModules(fixture.root);
    assert.deepEqual(
      modules.map((module) => module.name),
      ['direct-module', 'transitive-module']
    );
    assert.deepEqual(modules[0], {
      name: 'direct-module',
      version: '1.0.0',
      path: fs.realpathSync(direct),
      podspecPath: fs.realpathSync(path.join(direct, 'ios', 'Module.podspec')),
      swiftModuleName: 'DirectPod',
      modules: ['DirectModule'],
    });
    assert.equal(modules[1].path, fs.realpathSync(transitive));

    const command = childProcess.spawnSync(
      process.execPath,
      [AUTOLINKER, '--project-root', fixture.root],
      { encoding: 'utf8' }
    );
    assert.equal(command.status, 0, command.stderr);
    assert.deepEqual(JSON.parse(command.stdout).modules, modules);
  } finally {
    removeFixture(fixture);
  }
});

test('rejects duplicate package resolutions reported by the authentic search command', () => {
  const fixture = createFixture({
    autolinking: { searchPaths: ['./modules-a', './modules-b'] },
  });
  try {
    fixture.addModule(
      'duplicate-module',
      moduleConfig('DuplicateModule', 'DuplicatePod'),
      { directory: path.join(fixture.root, 'modules-a', 'duplicate-module') }
    );
    fixture.addModule(
      'duplicate-module',
      moduleConfig('DuplicateModule', 'DuplicatePod'),
      { directory: path.join(fixture.root, 'modules-b', 'duplicate-module') }
    );
    assert.throws(
      () => discoverModules(fixture.root),
      /duplicate-module was resolved more than once/
    );
  } finally {
    removeFixture(fixture);
  }
});

test('rejects unsupported watch config keys and podspec paths that escape package roots', () => {
  const cases = [
    {
      name: 'ui-key',
      config: {
        platforms: ['watchos'],
        watchos: {
          modules: ['UiModule'],
          podspecPath: 'Ui.podspec',
          swiftModuleName: 'UiPod',
          appDelegateSubscribers: [],
        },
      },
      error: /unsupported keys/,
    },
    {
      name: 'escaping-podspec',
      config: moduleConfig('EscapeModule', 'EscapePod', '../outside.podspec'),
      error: /relative .podspec path|remain inside/,
    },
    {
      name: 'bad-swift-name',
      config: moduleConfig('BadModule', 'Not-A-Swift-Identifier'),
      error: /non-reserved simple Swift identifier/,
    },
    {
      name: 'reserved-swift-identifier',
      config: moduleConfig('class', 'for'),
      error: /non-reserved simple Swift identifier/,
    },
  ];
  for (const entry of cases) {
    const fixture = createFixture({ dependencies: { [entry.name]: '1.0.0' } });
    try {
      fixture.addModule(entry.name, entry.config);
      assert.throws(() => discoverModules(fixture.root), entry.error);
    } finally {
      removeFixture(fixture);
    }
  }
});

test('rejects Swift module map collisions before generating the provider', () => {
  const fixture = createFixture({
    dependencies: {
      'first-module': '1.0.0',
      'second-module': '1.0.0',
    },
  });
  try {
    fixture.addModule('first-module', moduleConfig('FirstClass', 'SharedPod'));
    fixture.addModule(
      'second-module',
      moduleConfig('SecondClass', 'SharedPod')
    );
    assert.throws(
      () => discoverModules(fixture.root),
      /declare the same Swift module name: SharedPod/
    );
  } finally {
    removeFixture(fixture);
  }
});

test('writes a deterministic qualified provider and replaces stale registrations with empty output', () => {
  const fixture = createFixture({
    dependencies: { 'provider-module': '1.0.0' },
  });
  try {
    fixture.addModule(
      'provider-module',
      moduleConfig('ProviderModule', 'ProviderPod')
    );
    const output = path.join(
      fixture.root,
      'generated',
      'RNWExpoModulesProvider.swift'
    );
    const modules = writeProvider(fixture.root, output);
    assert.equal(modules.length, 1);
    assert.equal(
      fs.readFileSync(output, 'utf8'),
      [
        '// Generated by @appsent-co/react-native-watchos. Do not edit.',
        'import ExpoModulesCore',
        'import ProviderPod',
        '',
        '@objc(RNWExpoModulesProvider)',
        'public class RNWExpoModulesProvider: ModulesProvider {',
        '  public override func getModuleClasses() -> [ExpoModuleTupleType] {',
        '    return [',
        '      (module: ProviderPod.ProviderModule.self, name: nil)',
        '    ]',
        '  }',
        '}',
        '',
      ].join('\n')
    );

    fixture.updateApp((app) => {
      app.expo.autolinking.watchos.exclude = ['provider-module'];
    });
    assert.deepEqual(writeProvider(fixture.root, output), []);
    assert.match(fs.readFileSync(output, 'utf8'), /return \[\]/);
    assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /ProviderModule/);
  } finally {
    removeFixture(fixture);
  }
});

test('provider rendering uses the Core57 tuple API and stable qualified ordering', () => {
  const provider = renderProvider([
    { swiftModuleName: 'ZPod', modules: ['ZModule'] },
    { swiftModuleName: 'APod', modules: ['SecondModule', 'FirstModule'] },
  ]);
  assert.match(provider, /getModuleClasses\(\) -> \[ExpoModuleTupleType\]/);
  assert.match(provider, /import APod\nimport ZPod/);
  assert.ok(
    provider.indexOf('APod.FirstModule.self') <
      provider.indexOf('APod.SecondModule.self')
  );
  assert.ok(
    provider.indexOf('APod.SecondModule.self') <
      provider.indexOf('ZPod.ZModule.self')
  );
  assert.throws(
    () =>
      renderProvider([
        { swiftModuleName: 'SamePod', modules: ['FirstClass'] },
        { swiftModuleName: 'SamePod', modules: ['SecondClass'] },
      ]),
    /more than one package for Swift module SamePod/
  );
});

test('generic Ruby autolinking recognizes Expo package metadata', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rnw-ruby-expo-metadata-')
  );
  try {
    fs.writeFileSync(path.join(root, 'expo-module.config.json'), '{}');
    const command = childProcess.spawnSync(
      'ruby',
      [
        '-e',
        'require ARGV.shift; puts _rnw_expo_module_package?({"root" => ARGV.shift})',
        path.join(REPO_ROOT, 'cocoapods', 'autolink.rb'),
        root,
      ],
      { encoding: 'utf8' }
    );
    assert.equal(command.status, 0, command.stderr);
    assert.equal(command.stdout.trim(), 'true');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
