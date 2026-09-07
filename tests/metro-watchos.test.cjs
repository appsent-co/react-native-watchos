const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { withWatchosMetro } = require('../plugin/src/withWatchosMetro');
const metroResolver = require(
  require.resolve('metro-resolver', {
    paths: [require.resolve('expo/package.json')],
  })
);

function write(filePath, contents = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function lookup(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      type: stat.isDirectory() ? 'd' : 'f',
      realPath: fs.realpathSync(filePath),
    };
  } catch {
    return { exists: false };
  }
}

function createMetroContext(root, originModulePath, resolveRequest) {
  const packageRoot = path.join(root, 'node_modules', 'conditional-package');
  const getPackageForModule = (modulePath) => {
    if (!modulePath.startsWith(packageRoot)) return null;
    return {
      rootPath: packageRoot,
      packageJson: JSON.parse(
        fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
      ),
      packageRelativePath: path.relative(packageRoot, modulePath),
    };
  };

  return {
    originModulePath,
    resolveRequest,
    allowHaste: false,
    assetExts: new Set(),
    disableHierarchicalLookup: false,
    doesFileExist: (filePath) => lookup(filePath).type === 'f',
    extraNodeModules: {},
    fileSystemLookup: lookup,
    getPackage: (packageJsonPath) =>
      JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')),
    getPackageForModule,
    mainFields: ['react-native', 'browser', 'main'],
    nodeModulesPaths: [],
    preferNativePlatform: true,
    resolveAsset: () => null,
    resolveHasteModule: () => null,
    resolveHastePackage: () => null,
    sourceExts: ['ts', 'js'],
    unstable_conditionNames: ['custom-condition'],
    unstable_conditionsByPlatform: { watchos: ['react-native'] },
    unstable_enablePackageExports: true,
    unstable_logWarning: () => {},
  };
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-metro-'));
  for (const directory of ['watch', 'native', 'base', 'exports']) {
    write(path.join(root, directory, 'index.ts'));
  }
  write(path.join(root, 'watch', 'screen.watchos.ts'));
  write(path.join(root, 'watch', 'screen.native.ts'));
  write(path.join(root, 'watch', 'screen.ts'));
  write(path.join(root, 'native', 'screen.native.ts'));
  write(path.join(root, 'native', 'screen.ts'));
  write(path.join(root, 'base', 'screen.ts'));
  write(
    path.join(root, 'node_modules', 'conditional-package', 'package.json'),
    JSON.stringify({
      name: 'conditional-package',
      exports: {
        '.': {
          'react-native': './react-native.js',
          'default': './default.js',
        },
      },
    })
  );
  write(
    path.join(root, 'node_modules', 'conditional-package', 'react-native.js')
  );
  write(path.join(root, 'node_modules', 'conditional-package', 'default.js'));
  return root;
}

test('watchOS fallback uses ordered extensions and React Native export conditions', () => {
  const root = makeFixture();
  const terminalCalls = [];
  const terminalResolver = (context, moduleName, platform) => {
    terminalCalls.push({ context, moduleName, platform });
    // Metro treats a resolveRequest different from itself as an override. The
    // Expo terminal resolver has already consumed the wrapper, so emulate it
    // here by re-entering Metro with its own resolver identity.
    return metroResolver.resolve(
      { ...context, resolveRequest: metroResolver.resolve },
      moduleName,
      platform
    );
  };
  const config = withWatchosMetro({
    resolver: {
      platforms: ['ios'],
      unstable_conditionsByPlatform: { ios: ['react-native'] },
    },
  });

  try {
    const resolveFrom = (directory, moduleName) =>
      config.resolver.resolveRequest(
        createMetroContext(
          root,
          path.join(root, directory, 'index.ts'),
          terminalResolver
        ),
        moduleName,
        'watchos'
      );

    assert.equal(
      resolveFrom('watch', './screen').filePath,
      fs.realpathSync(path.join(root, 'watch', 'screen.watchos.ts'))
    );
    assert.equal(
      resolveFrom('native', './screen').filePath,
      fs.realpathSync(path.join(root, 'native', 'screen.native.ts'))
    );
    assert.equal(
      resolveFrom('base', './screen').filePath,
      fs.realpathSync(path.join(root, 'base', 'screen.ts'))
    );
    assert.equal(
      resolveFrom('exports', 'conditional-package').filePath,
      fs.realpathSync(
        path.join(
          root,
          'node_modules',
          'conditional-package',
          'react-native.js'
        )
      )
    );

    assert.equal(terminalCalls.length, 4);
    for (const { context, platform } of terminalCalls) {
      assert.equal(platform, null);
      assert.equal(context.preferNativePlatform, false);
      assert.deepEqual(context.sourceExts, [
        'watchos.ts',
        'native.ts',
        'ts',
        'watchos.js',
        'native.js',
        'js',
      ]);
      assert.deepEqual(context.unstable_conditionNames, [
        'custom-condition',
        'react-native',
      ]);
      assert.equal(context.resolveRequest, terminalResolver);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('custom resolvers retain watchOS while their fallback is terminal and iOS is unchanged', () => {
  const calls = [];
  const terminal = (context, moduleName, platform) => {
    calls.push({ kind: 'terminal', context, moduleName, platform });
    return { type: 'sourceFile', filePath: '/terminal.js' };
  };
  const customResolver = (context, moduleName, platform) => {
    calls.push({ kind: 'custom', context, moduleName, platform });
    return context.resolveRequest(context, moduleName, platform);
  };
  const config = withWatchosMetro({
    resolver: {
      platforms: ['ios'],
      resolveRequest: customResolver,
      unstable_conditionsByPlatform: { ios: ['react-native'] },
    },
  });
  const sourceExts = ['ts', 'js'];
  const watchContext = {
    resolveRequest: terminal,
    sourceExts,
    unstable_conditionNames: [],
    unstable_conditionsByPlatform: { watchos: ['react-native'] },
    preferNativePlatform: true,
  };

  assert.deepEqual(
    config.resolver.resolveRequest(watchContext, 'some-package', 'watchos'),
    { type: 'sourceFile', filePath: '/terminal.js' }
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].kind, 'custom');
  assert.equal(calls[0].platform, 'watchos');
  assert.equal(calls[1].kind, 'terminal');
  assert.equal(calls[1].platform, null);
  assert.equal(calls[1].context.resolveRequest, terminal);
  assert.deepEqual(calls[1].context.sourceExts, [
    'watchos.ts',
    'native.ts',
    'ts',
    'watchos.js',
    'native.js',
    'js',
  ]);

  calls.length = 0;
  assert.deepEqual(
    config.resolver.resolveRequest(
      { ...watchContext, resolveRequest: terminal, sourceExts },
      'some-package',
      'ios'
    ),
    { type: 'sourceFile', filePath: '/terminal.js' }
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].platform, 'ios');
  assert.equal(calls[1].platform, 'ios');
  assert.equal(calls[1].context.sourceExts, sourceExts);
  assert.equal(calls[1].context.preferNativePlatform, true);
});

test('calling withWatchosMetro twice does not recurse or duplicate watchOS resolution', () => {
  let terminalCalls = 0;
  const terminal = (context, moduleName, platform) => {
    terminalCalls += 1;
    assert.equal(moduleName, 'some-package');
    assert.equal(platform, null);
    assert.deepEqual(context.sourceExts, ['watchos.ts', 'native.ts', 'ts']);
    return { type: 'sourceFile', filePath: '/terminal.js' };
  };
  const config = {
    resolver: {
      platforms: ['ios'],
      unstable_conditionsByPlatform: { ios: ['react-native'] },
    },
  };
  withWatchosMetro(config);
  withWatchosMetro(config);

  assert.deepEqual(config.resolver.platforms, ['ios', 'watchos']);
  assert.deepEqual(config.resolver.unstable_conditionsByPlatform.watchos, [
    'react-native',
  ]);
  assert.deepEqual(
    config.resolver.resolveRequest(
      {
        resolveRequest: terminal,
        sourceExts: ['ts'],
        unstable_conditionNames: [],
        unstable_conditionsByPlatform: { watchos: ['react-native'] },
        preferNativePlatform: true,
      },
      'some-package',
      'watchos'
    ),
    { type: 'sourceFile', filePath: '/terminal.js' }
  );
  assert.equal(terminalCalls, 1);
});
