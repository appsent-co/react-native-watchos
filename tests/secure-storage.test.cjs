const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const plist = require('@expo/plist').default;
const { defaultAccessGroup } = require('../plugin/src/withSecureStorage');
const { ensureWatchInfoPlist } = require('../plugin/src/withWatchInfoPlist');

function storage(native) {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/secureStorage/index.ts'),
    'utf8'
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    {
      exports,
      require: () => ({ default: native }),
      Uint8Array,
      atob,
      btoa,
    }
  );
  return exports.SecureStorage;
}

test('bytes preserve empty values, all byte values, and view bounds', async () => {
  const values = new Map();
  const api = storage({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  });
  assert.equal(await api.getBytes('absent'), null);
  for (const bytes of [
    new Uint8Array(),
    Uint8Array.from({ length: 256 }, (_, i) => i),
    new Uint8Array([99, 0, 255, 88]).subarray(1, 3),
  ]) {
    await api.setBytes('key', bytes);
    assert.deepEqual(await api.getBytes('key'), bytes);
    assert.equal(
      await api.getItem('key'),
      Buffer.from(bytes).toString('base64')
    );
  }
  await api.setItem('key', 'AAE=');
  assert.deepEqual(await api.getBytes('key'), new Uint8Array([0, 1]));
  await api.removeItem('key');
  assert.equal(await api.getItem('key'), null);
});

test('byte facade propagates native failures', async () => {
  const error = new Error('locked');
  const api = storage({
    getItem: async () => {
      throw error;
    },
    setItem: async () => {
      throw error;
    },
  });
  await assert.rejects(api.getBytes('key'), (e) => e === error);
  await assert.rejects(
    api.setBytes('key', new Uint8Array()),
    (e) => e === error
  );
});

test('default scope preserves the first shared group and expands the private build setting', () => {
  assert.equal(
    defaultAccessGroup({}),
    '$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)'
  );
  assert.equal(
    defaultAccessGroup({
      'keychain-access-groups': ['PREFIX.shared', 'PREFIX.private'],
    }),
    'PREFIX.shared'
  );
  assert.equal(
    defaultAccessGroup({
      'keychain-access-groups': ['$(AppIdentifierPrefix)$(CFBundleIdentifier)'],
    }),
    '$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)'
  );
  assert.throws(() =>
    defaultAccessGroup({ 'keychain-access-groups': 'malformed' })
  );
});

test('init/prebuild plist helper pins prior default and preserves explicit selection', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-storage-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'expo-target.config.json'),
      JSON.stringify({
        entitlements: {
          'keychain-access-groups': ['PREFIX.shared', 'PREFIX.private'],
        },
      })
    );
    ensureWatchInfoPlist(dir);
    const file = path.join(dir, 'Info.plist');
    const first = plist.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(first.RNWSecureStorageAccessGroup, 'PREFIX.shared');
    first.RNWSecureStorageAccessGroup = 'PREFIX.chosen';
    fs.writeFileSync(file, plist.build(first));
    ensureWatchInfoPlist(dir);
    assert.equal(
      plist.parse(fs.readFileSync(file, 'utf8')).RNWSecureStorageAccessGroup,
      'PREFIX.chosen'
    );
    fs.unlinkSync(path.join(dir, 'expo-target.config.json'));
    ensureWatchInfoPlist(dir); // Dynamic target config is fine with an explicit group.
    fs.unlinkSync(file);
    ensureWatchInfoPlist(dir);
    assert.equal(
      plist.parse(fs.readFileSync(file, 'utf8')).RNWSecureStorageAccessGroup,
      undefined
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('iOS plist mod selects declared default and preserves an explicit group', () => {
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../plugin/src/withSecureStorage.js'),
      'utf8'
    ),
    {
      module,
      require: (name) =>
        name === '@expo/config-plugins'
          ? { withInfoPlist: (config, action) => action(config) }
          : require(name),
      console,
    }
  );
  const config = {
    ios: { entitlements: { 'keychain-access-groups': ['PREFIX.shared'] } },
    modResults: {},
  };
  module.exports(config);
  assert.equal(config.modResults.RNWSecureStorageAccessGroup, 'PREFIX.shared');
  config.modResults.RNWSecureStorageAccessGroup = 'PREFIX.explicit';
  module.exports(config);
  assert.equal(
    config.modResults.RNWSecureStorageAccessGroup,
    'PREFIX.explicit'
  );
});

test('existing watch entitlements file retains its original group across setup', () => {
  const {
    ensureWatchTargetEntitlements,
  } = require('../plugin/src/withWatchTargetConfig');
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rnw-existing-entitlements-')
  );
  try {
    const configPath = path.join(dir, 'expo-target.config.json');
    fs.writeFileSync(configPath, JSON.stringify({ type: 'watch' }));
    fs.writeFileSync(
      path.join(dir, 'existing.entitlements'),
      plist.build({ 'keychain-access-groups': ['PREFIX.legacy'] })
    );
    assert.equal(ensureWatchTargetEntitlements(dir).added, false);
    assert.equal(
      JSON.parse(fs.readFileSync(configPath, 'utf8')).entitlements,
      undefined
    );
    ensureWatchInfoPlist(dir);
    assert.equal(
      plist.parse(fs.readFileSync(path.join(dir, 'Info.plist'), 'utf8'))
        .RNWSecureStorageAccessGroup,
      'PREFIX.legacy'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
