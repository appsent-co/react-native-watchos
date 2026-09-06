const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const SOURCE = path.join(__dirname, '..', 'src', 'expoModules.ts');

function loadFacade(expo) {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  const runtimeGlobal = { expo };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    globalThis: runtimeGlobal,
    Error,
    Object,
    require(name) {
      if (name === 'expo-modules-core/src/uuid')
        return { default: 'native-uuid' };
      if (name === 'expo-modules-core') return {};
      throw new Error('unexpected facade import: ' + name);
    },
  });
  return module.exports;
}

test('watch facade preserves native Expo constructor identity and native module instances', () => {
  class NativeModule {}
  class EventEmitter {}
  class SharedObject {}
  class SharedRef {}
  const installed = new NativeModule();
  const facade = loadFacade({
    NativeModule,
    EventEmitter,
    SharedObject,
    SharedRef,
    modules: { Installed: installed },
  });

  assert.equal(facade.NativeModule, NativeModule);
  assert.equal(facade.EventEmitter, EventEmitter);
  assert.equal(facade.SharedObject, SharedObject);
  assert.equal(facade.SharedRef, SharedRef);
  assert.equal(facade.requireOptionalNativeModule('Installed'), installed);
  assert.equal(facade.requireNativeModule('Installed'), installed);
  assert.equal(facade.uuid, 'native-uuid');
  assert.equal(facade.Platform.OS, 'watchos');
  assert.equal(
    facade.Platform.select({ watchos: 'watch', native: 'native' }),
    'watch'
  );
  assert.equal(facade.Platform.select({ native: 'native' }), 'native');
  assert.equal(facade.Platform.select({ default: 'default' }), 'default');
});

test('watch facade never manufactures a TurboModule fallback', () => {
  const facade = loadFacade({
    NativeModule: class NativeModule {},
    EventEmitter: class EventEmitter {},
    SharedObject: class SharedObject {},
    SharedRef: class SharedRef {},
    modules: {},
  });
  assert.equal(facade.requireOptionalNativeModule('Missing'), null);
  assert.throws(
    () => facade.requireNativeModule('Missing'),
    /Cannot find native module 'Missing'.*watchOS support/
  );
});

test('watch facade fails clearly when the native Expo runtime is absent', () => {
  assert.throws(
    () => loadFacade(undefined),
    /Expo modules are not installed in this watch runtime/
  );
  assert.throws(
    () => loadFacade({ modules: {}, NativeModule: class NativeModule {} }),
    /Expo modules are not installed in this watch runtime/
  );
});

test('watch facade makes non-UI APIs explicitly unavailable', () => {
  const facade = loadFacade({
    NativeModule: class NativeModule {},
    EventEmitter: class EventEmitter {},
    SharedObject: class SharedObject {},
    SharedRef: class SharedRef {},
    modules: {},
  });
  assert.throws(
    () => facade.requireNativeViewManager(),
    /ExpoModulesCore\.requireNativeViewManager is not available on watchos/
  );
  assert.throws(
    () => facade.installOnUIRuntime(),
    /ExpoModulesCore\.installOnUIRuntime is not available on watchos/
  );
});
