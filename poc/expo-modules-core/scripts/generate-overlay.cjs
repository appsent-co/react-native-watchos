#!/usr/bin/env node
'use strict';

// Generates a small, auditable watchOS source closure from Expo Modules Core.
// Nothing is patched in node_modules; every generated file lives in build/.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const overlayRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(overlayRoot, '..', '..');
const outputRoot = path.join(overlayRoot, 'build', 'ExpoModulesCore');
const expected = {
  'expo': '57.0.20',
  'expo-modules-core': '57.0.16',
  'expo-modules-jsi': '57.0.8',
  'react-native': '0.86.3',
};

function fail(message) {
  throw new Error(`RNW Expo Modules Core overlay: ${message}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolvePackages() {
  const expoPackage = require.resolve('expo/package.json', {
    paths: [workspaceRoot],
  });
  const expoRequire = createRequire(expoPackage);
  const packages = {};
  for (const name of Object.keys(expected)) {
    const packageFile = expoRequire.resolve(`${name}/package.json`);
    const pkg = readJson(packageFile);
    if (pkg.version !== expected[name]) {
      fail(
        `${name} must be ${expected[name]}, found ${pkg.version} at ${packageFile}`
      );
    }
    packages[name] = {
      packageFile,
      root: path.dirname(packageFile),
      version: pkg.version,
    };
  }
  return packages;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function copyFile(sourceRoot, relative, transforms) {
  const source = path.join(sourceRoot, relative);
  const destination = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  let contents = fs.readFileSync(source, 'utf8');
  if (transforms[relative]) contents = transforms[relative](contents);
  fs.writeFileSync(destination, contents);
}

function removeRange(source, start, end, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) fail(`cannot find start marker for ${label}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) fail(`cannot find end marker for ${label}`);
  return source.slice(0, startIndex) + source.slice(endIndex);
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) fail(`cannot find replacement for ${label}`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

function transformAppContext(source) {
  source = replaceOnce(
    source,
    '@preconcurrency internal import React\nimport ExpoModulesJSI',
    'import Foundation\nimport ExpoModulesJSI',
    'AppContext imports'
  );
  source = removeRange(
    source,
    '  /**\n   The legacy module registry with modules written in the old-fashioned way.',
    '  /**\n   Underlying JSI runtime of the running app.',
    'legacy React state'
  );
  source = removeRange(
    source,
    '  public typealias UIRuntimeFactory = (',
    '  /**\n   Code signing entitlements for code signing',
    'UI runtime and app identifier'
  );
  source = replaceOnce(
    source,
    '  public let appCodeSignEntitlements = AppContext.modulesProvider().getAppCodeSignEntitlements()',
    '  public let appCodeSignEntitlements = AppCodeSignEntitlements(appGroups: nil)',
    'code sign entitlements'
  );
  source = replaceOnce(
    source,
    '    self.moduleRegistry.register(module: JSLoggerModule(appContext: self), name: nil)\n    listenToClientAppNotifications()',
    '    self.moduleRegistry.register(module: JSLoggerModule(appContext: self), name: nil)',
    'client notification initialization'
  );
  source = removeRange(
    source,
    '  public convenience init(legacyModuleRegistry: Any, config: AppContextConfig? = nil) {',
    '  @objc\n  @discardableResult',
    'legacy initializer'
  );
  source = removeRange(
    source,
    '  // MARK: - UI\n',
    '  // MARK: - Running on specific queues',
    'view lookup'
  );
  source = removeRange(
    source,
    '  // MARK: - Legacy modules\n',
    '  /**\n   Provides an event emitter that is compatible with the legacy interface.',
    'legacy interfaces'
  );
  source = removeRange(
    source,
    '  /**\n   Starts listening to `UIApplication` notifications.',
    '  /**\n   Returns a bool whether the module with given name is registered in this context.',
    'app lifecycle notifications'
  );
  const registrationStart =
    '  @objc\n  public func registerNativeModules(provider: ModulesProvider) {';
  const runtimeMarker = '  // MARK: - Runtime';
  const registrationIndex = source.indexOf(registrationStart);
  const runtimeIndex = source.indexOf(runtimeMarker, registrationIndex);
  if (registrationIndex < 0 || runtimeIndex < 0)
    fail('cannot find module registration section');
  source =
    source.slice(0, registrationIndex) +
    [
      '  @objc',
      '  public func registerNativeModules(provider: ModulesProvider) {',
      '    useModulesProvider(provider)',
      '  }',
      '',
    ].join('\n') +
    source.slice(runtimeIndex);
  source = removeRange(
    source,
    '    if let appIdentifier {\n      coreObject.defineProperty("__expo_app_identifier__", value: appIdentifier)\n    }\n\n',
    '    try coreModuleHolder.definition.decorate(object: coreObject, appContext: self)',
    'runtime app identifier'
  );
  source = removeRange(
    source,
    '  @MainActor\n  internal func prepareUIRuntime() throws {',
    '  /**\n   Unsets runtime objects that we hold for each module.',
    'UI runtime preparation'
  );
  source = source.replace(
    'Sets the JavaScript runtime from raw pointers. Called by `ExpoReactNativeFactory`\n   when React Native initializes the runtime.',
    'Sets the JavaScript runtime from raw pointers supplied by the host.'
  );
  source = source.replace(
    '   `scheduler` is an opaque handle that `dispatch` understands; the factories pass\n   a handle created by `expo::createReactSchedulerHandle` that references the React\n   runtime scheduler weakly (see `EXReactSchedulerDispatch.h`).',
    '   `scheduler` is an opaque, host-owned handle that `dispatch` understands.'
  );
  source = replaceOnce(
    source,
    '    NotificationCenter.default.removeObserver(self)\n\n',
    '',
    'notification removal'
  );
  source = removeRange(
    source,
    '  @objc\n  public func setHostWrapper(_ wrapper: ExpoHostWrapper) {',
    '  // MARK: - Statics',
    'host wrapper'
  );
  source = removeRange(
    source,
    '  public func reloadAppAsync(_ reason: String = "Reload from appContext") {',
    '}\n\n/**\n Reference-type store for cached worklet prototypes.',
    'reload and worklet cache'
  );
  source = removeRange(
    source,
    '/**\n Reference-type store for cached worklet prototypes.',
    '// MARK: - Public exceptions',
    'worklet prototype cache'
  );
  source = replaceOnce(
    source,
    'public final class AppContext: NSObject, EXAppContextProtocol, @unchecked Sendable',
    'public final class AppContext: NSObject, @unchecked Sendable',
    'AppContext protocol'
  );
  source = source.replace(
    '  ) {\n  ) {\n    if let scheduler',
    '  ) {\n    if let scheduler'
  );
  return source;
}

function transformModuleDefinition(source) {
  source = replaceOnce(
    source,
    'let DEFAULT_MODULE_VIEW = "DEFAULT_MODULE_VIEW"\n\n',
    '',
    'DEFAULT_MODULE_VIEW'
  );
  source = replaceOnce(
    source,
    '  let views: [String: AnyViewDefinition]\n\n',
    '',
    'view collection'
  );
  source = removeRange(
    source,
    '    let viewDefinitions: [AnyViewDefinition] = definitions',
    '    self.eventNames = Array(',
    'view definition extraction'
  );
  source = removeRange(
    source,
    '    let viewPrototypesObject = try appContext.runtime.createObject()\n\n',
    '    if !eventObservers.isEmpty {',
    'view prototype building'
  );
  source = replaceOnce(
    source,
    '    object.setProperty("ViewPrototypes", value: viewPrototypesObject)',
    '    object.setProperty("ViewPrototypes", value: try appContext.runtime.createObject())',
    'empty view prototypes'
  );
  return source;
}

function transformCoreModule(source) {
  source = source.replace('internal import React\n', '');
  source = removeRange(
    source,
    '    Function("installOnUIRuntime") {',
    '    // Expose some common classes and maybe even the `modules` host object in the future.',
    'worklet installer'
  );
  source = removeRange(
    source,
    '    // swiftlint:disable:next unused_closure_parameter\n    Function("getViewConfig") {',
    '  }\n\n  private func getHolderName',
    'view config'
  );
  source = removeRange(
    source,
    '  private func getHolderName(_ viewName: String) -> String {',
    '}\n\ninternal final class WorkletUIRuntimeException',
    'view holder helper'
  );
  const exceptionIndex = source.indexOf(
    'internal final class WorkletUIRuntimeException'
  );
  if (exceptionIndex >= 0) source = source.slice(0, exceptionIndex);
  return source.trimEnd() + '\n';
}

function transformModulesProvider(source) {
  source = removeRange(
    source,
    '  /**\n   Returns an array of classes that hooks into `ExpoAppDelegate` to receive app delegate events.',
    '  func getAppCodeSignEntitlements() -> AppCodeSignEntitlements',
    'app/delegate provider requirements'
  );
  source = removeRange(
    source,
    '  open func getAppDelegateSubscribers() -> [ExpoAppDelegateSubscriber.Type] {',
    '  open func getAppCodeSignEntitlements() -> AppCodeSignEntitlements {',
    'provider React implementations'
  );
  return source;
}

function transformAsyncFunction(source) {
  source = replaceOnce(
    source,
    '      dispatchOnQueueUntilViewRegisters(appContext: appContext, arguments: nativeArguments, queue: queue, bodyBlock)',
    '      queue.async(execute: bodyBlock)',
    'non-view async scheduling'
  );
  source = removeRange(
    source,
    '  /**\n   * Checks if the `AsyncFunction` is a method of a `View`',
    '  // MARK: - JavaScriptObjectBuilder',
    'view registration retry'
  );
  return source;
}

function transformException(source) {
  source = removeRange(
    source,
    '  /**\n   An exception to throw when the view with the given tag and class cannot be found.',
    '  /**\n   An exception to throw when a JavaScript caller passes a number of arguments',
    'view exceptions'
  );
  return source;
}

function transformFactory(source, name) {
  source = source.replace(
    /^\/\*\*\n (?:Asynchronous function|Synchronous function) from an optimized function descriptor\.\n The descriptor is produced by `@OptimizedFunction` macro-generated peer functions\.\n \*\/\n/,
    ''
  );
  const start = source.indexOf(
    'public func ' +
      (name === 'async' ? 'AsyncFunction' : 'Function') +
      '(\n  _ name: String,\n  _ descriptor: OptimizedFunctionDescriptor'
  );
  if (start < 0) fail(`cannot find optimized ${name} factory`);
  const nextDoc = source.indexOf('/**', start + 1);
  if (nextDoc < 0) fail(`cannot find normal ${name} factory`);
  return source.slice(0, start) + source.slice(nextDoc);
}

function transformInstallerHeader(source) {
  source = source.replace(
    /#if !__building_module\(ExpoModulesCore\)[\s\S]*?#endif\n\n/,
    ''
  );
  source = source.replace(
    /#if __has_include\(<ReactCommon\/RCTRuntimeExecutor.h>\)[\s\S]*?#endif[^\n]*\n\n/,
    ''
  );
  return '#import <Foundation/Foundation.h>\n\n' + source;
}

function transformInstallerImplementation(source) {
  return source
    .replace('#import <ExpoModulesCore/BridgelessJSCallInvoker.h>\n', '')
    .replace('#import <ExpoModulesCore/EXAppContextProtocol.h>\n', '')
    .replace(
      '#import <react/renderer/runtimescheduler/RuntimeScheduler.h>\n',
      ''
    )
    .replace(
      '#import <react/renderer/runtimescheduler/RuntimeSchedulerBinding.h>\n',
      ''
    );
}

function transformUtilities(source) {
  const marker =
    '/**\n A collection of utility functions for various Expo Modules common tasks.';
  const index = source.indexOf(marker);
  if (index < 0) fail('cannot find UI Utilities API');
  return source.slice(0, index);
}

function transformLogHandlers(source) {
  source = replaceOnce(
    source,
    '  return PersistentFileLogHandler(category: category)',
    '  return createOSLogHandler(category: category)',
    'persistent log fallback'
  );
  const marker =
    '/**\n Log handler that writes all logs to a file using PersistentFileLog';
  const index = source.indexOf(marker);
  if (index < 0) fail('cannot find persistent log handler');
  return source.slice(0, index);
}

function transformPromise(source) {
  source = removeRange(
    source,
    '  /**\n   The resolver that is compatible with the legacy `EXPromiseResolveBlock`.',
    '  public func resolve(_ value: Any? = nil) {',
    'legacy Promise bridge'
  );
  return source;
}

function transformExpoRuntime(source) {
  return replaceOnce(
    source,
    'public class ExpoRuntime: JavaScriptRuntime, @unchecked Sendable {',
    'public class ExpoRuntime: JavaScriptRuntime, @unchecked Sendable {\n  /// Retains the watch host scheduler handle for this adopted runtime.\n  /// The owner is assigned before runtime installation so queued Expo callbacks\n  /// cannot outlive the scheduler context they dispatch through.\n  public var rnwSchedulerOwner: AnyObject?',
    'watch scheduler owner'
  );
}

function replaceSetRuntime(source) {
  const start = source.indexOf('  @objc\n  public func setRuntime(\n');
  const end = source.indexOf(
    '\n  @JavaScriptActor\n  internal func prepareRuntime()',
    start
  );
  if (start < 0 || end < 0) fail('cannot find setRuntime implementation');
  const replacement = `  /// Backward-compatible raw runtime entry point for hosts that do not need\n  /// an owned scheduler handle.\n  @objc\n  public func setRuntime(\n    _ runtimePointer: UnsafeMutableRawPointer,\n    scheduler: UnsafeMutableRawPointer?,\n    dispatch: UnsafeRawPointer?\n  ) {\n    setRuntime(runtimePointer, scheduler: scheduler, dispatch: dispatch, schedulerOwner: nil)\n  }\n\n  /// Adopts a host-owned JSI runtime and keeps its opaque scheduler context alive\n  /// for exactly the lifetime of ExpoRuntime. schedulerOwner is normally the\n  /// RNW binding object; it must be assigned before _runtime triggers the\n  /// authentic Expo runtime installation path.\n  @objc(setRuntime:scheduler:dispatch:schedulerOwner:)\n  public func setRuntime(\n    _ runtimePointer: UnsafeMutableRawPointer,\n    scheduler: UnsafeMutableRawPointer?,\n    dispatch: UnsafeRawPointer?,\n    schedulerOwner: AnyObject?\n  ) {\n    let runtime: ExpoRuntime\n    if let scheduler, let dispatch {\n      runtime = ExpoRuntime(\n        unsafePointer: runtimePointer,\n        scheduler: scheduler,\n        dispatch: dispatch\n      )\n    } else {\n      runtime = ExpoRuntime(unsafePointer: runtimePointer)\n    }\n    runtime.rnwSchedulerOwner = schedulerOwner\n    _runtime = runtime\n  }\n`;
  return source.slice(0, start) + replacement + source.slice(end);
}

function writeUmbrella() {
  // Swift's ObjC importer must not parse the unguarded C++ JSI headers used by
  // the real installer. ObjC++ sources still include those headers directly.
  const umbrella = `// Generated by scripts/generate-overlay.cjs.\n// Swift-safe ObjC surface for the non-UI Expo Modules Core runtime.\n\n#import "CoreModuleHelper.h"\n#import "EXJSIInstaller.h"\n#import "EXJSUtils.h"\n#import "EXSharedObjectUtils.h"\n`;
  const destination = path.join(outputRoot, 'ios', 'ExpoModulesCore.h');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, umbrella);

  const moduleMap = `framework module ExpoModulesCore {\n  umbrella header "ExpoModulesCore.h"\n  export *\n  module * { export * }\n}\n`;
  fs.writeFileSync(path.join(outputRoot, 'ios', 'module.modulemap'), moduleMap);
}

function include(relative) {
  if (relative === 'ios/ExpoModulesCore.swift') return true;
  if (relative.startsWith('ios/Api/')) {
    return ![
      'ios/Api/Builders/ViewDefinitionBuilder.swift',
      'ios/Api/Factories/ViewFactories.swift',
    ].includes(relative);
  }
  if (relative.startsWith('ios/Core/')) {
    const excluded = [
      'ios/Core/Views/',
      'ios/Core/Protocols/AnyExpoView.swift',
      'ios/Core/Protocols/AnyViewDefinition.swift',
      'ios/Core/DynamicTypes/DynamicViewType.swift',
      'ios/Core/DynamicTypes/DynamicSwiftUIViewType.swift',
      'ios/Core/Events/EventDispatcher.swift',
      'ios/Core/Functions/OptimizedAsyncFunctionDefinition.swift',
      'ios/Core/Functions/OptimizedSyncFunctionDefinition.swift',
      'ios/Core/ExpoModulesMacros.swift',
      'ios/Core/Logging/PersistentFileLog.swift',
      'ios/Core/Convertibles/Convertibles+Color.swift',
    ];
    return !excluded.some(
      (entry) => relative === entry || relative.startsWith(entry)
    );
  }
  if (relative.startsWith('ios/JS/')) {
    return [
      'ios/JS/ExpoRuntimeInstaller.swift',
      'ios/JS/EXJSIInstaller.h',
      'ios/JS/EXJSIInstaller.mm',
      'ios/JS/EXJSUtils.h',
      'ios/JS/EXJSUtils.mm',
      'ios/JS/EXSharedObjectUtils.h',
      'ios/JS/EXSharedObjectUtils.mm',
    ].includes(relative);
  }
  if (relative.startsWith('ios/JSI/') || relative.startsWith('ios/Uuidv5/'))
    return true;
  if (
    relative === 'ios/Utilities/Utilities.swift' ||
    relative === 'ios/Utilities/Mutex.swift'
  )
    return true;
  if (relative.startsWith('common/cpp/')) {
    return (
      !relative.startsWith('common/cpp/fabric/') &&
      relative !== 'common/cpp/JSI/BridgelessJSCallInvoker.h' &&
      relative !== 'common/cpp/JSI/TestingSyncJSCallInvoker.h'
    );
  }
  return false;
}

function buildManifest(packages, copied) {
  const files = copied.sort().map((relative) => {
    const contents = fs.readFileSync(path.join(outputRoot, relative));
    return {
      path: relative,
      sha256: crypto.createHash('sha256').update(contents).digest('hex'),
    };
  });
  return {
    generatedBy: 'poc/expo-modules-core/scripts/generate-overlay.cjs',
    packages: Object.fromEntries(
      Object.entries(packages).map(([name, value]) => [
        name,
        { version: value.version, packageFile: value.packageFile },
      ])
    ),
    files,
  };
}

function generate() {
  const packages = resolvePackages();
  const coreRoot = packages['expo-modules-core'].root;
  fs.rmSync(outputRoot, { recursive: true, force: true });
  const transforms = {
    'ios/Core/Modules/ModuleDefinition.swift': transformModuleDefinition,
    'ios/Core/Modules/CoreModule.swift': transformCoreModule,
    'ios/Core/ModulesProvider.swift': transformModulesProvider,
    'ios/Core/Functions/AsyncFunctionDefinition.swift': transformAsyncFunction,
    'ios/Core/Exceptions/CommonExceptions.swift': transformException,
    'ios/Api/Factories/AsyncFunctionFactories.swift': (source) =>
      transformFactory(source, 'async'),
    'ios/Api/Factories/SyncFunctionFactories.swift': (source) =>
      transformFactory(source, 'sync'),
    'ios/JS/EXJSIInstaller.h': transformInstallerHeader,
    'ios/JS/EXJSIInstaller.mm': transformInstallerImplementation,
    'ios/Utilities/Utilities.swift': transformUtilities,
    'ios/Core/Logging/LogHandlers.swift': transformLogHandlers,
    'ios/Core/Promise.swift': transformPromise,
    'ios/Core/ExpoRuntime.swift': transformExpoRuntime,
    'ios/Core/AppContext.swift': (source) =>
      replaceSetRuntime(transformAppContext(source)),
  };
  const copied = [];
  for (const absolute of walk(coreRoot)) {
    const relative = path.relative(coreRoot, absolute);
    if (!include(relative)) continue;
    copyFile(coreRoot, relative, transforms);
    copied.push(relative);
  }
  writeUmbrella();
  copied.push('ios/ExpoModulesCore.h', 'ios/module.modulemap');
  const manifest = buildManifest(packages, copied);
  fs.writeFileSync(
    path.join(outputRoot, '.overlay-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  return manifest;
}

function check() {
  if (!fs.existsSync(path.join(outputRoot, '.overlay-manifest.json')))
    fail('overlay has not been generated');
  const before = fs.readFileSync(
    path.join(outputRoot, '.overlay-manifest.json'),
    'utf8'
  );
  const staging = `${outputRoot}.check-${process.pid}`;
  fs.renameSync(outputRoot, staging);
  try {
    const manifest = generate();
    const after = JSON.stringify(manifest, null, 2) + '\n';
    if (before !== after)
      fail(
        'generated overlay is stale; rerun pnpm --dir poc/expo-modules-core generate'
      );
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    fs.renameSync(staging, outputRoot);
  }
}

try {
  if (process.argv.includes('--check')) check();
  else {
    const manifest = generate();
    console.log(
      `Generated ${manifest.files.length} Expo Modules Core overlay files in ${outputRoot}`
    );
  }
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
