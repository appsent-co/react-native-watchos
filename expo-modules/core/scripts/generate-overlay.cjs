#!/usr/bin/env node
'use strict';

// Generates the narrowly-scoped, non-UI watchOS closure from authentic Expo
// Modules Core sources. It never changes node_modules.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const corePackageRoot = path.resolve(__dirname, '..');
const versionsFile = path.resolve(corePackageRoot, '..', 'versions.json');
const defaultOutputRoot = path.join(
  corePackageRoot,
  'build',
  'ExpoModulesCore'
);
const generatorId = 'expo-modules/core/scripts/generate-overlay.cjs';
const expectedCoreSourceFingerprint =
  'c9ca14a7a16bafbc051b9933d0483f9f9419cfc897e43c59da07d25f36db481d';
let outputRoot = defaultOutputRoot;

function fail(message) {
  throw new Error(`RNW Expo Modules Core overlay: ${message}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function treeFingerprint(root, directories) {
  const files = directories
    .flatMap((directory) => walk(path.join(root, directory)))
    .sort((left, right) => left.localeCompare(right));
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(path.relative(root, file));
    hash.update('\\0');
    hash.update(fs.readFileSync(file));
    hash.update('\\0');
  }
  return { files: files.length, sha256: hash.digest('hex') };
}

function requireVersion(versions, name) {
  if (typeof versions[name] !== 'string' || versions[name].length === 0) {
    fail(`versions.json is missing ${name}`);
  }
  return versions[name];
}

function loadVersions(file = versionsFile) {
  if (!fs.existsSync(file)) fail(`versions file is missing: ${file}`);
  const versions = readJson(file);
  for (const name of [
    'expo',
    'expo-modules-core',
    'expo-modules-jsi',
    'react-native',
    'react',
    'hermes',
    'watchos',
  ]) {
    requireVersion(versions, name);
  }
  return versions;
}

function resolvePackages(projectRoot, versions) {
  const expoPackage = require.resolve('expo/package.json', {
    paths: [projectRoot],
  });
  const expoRequire = createRequire(expoPackage);
  const packages = {};
  for (const name of [
    'expo',
    'expo-modules-core',
    'expo-modules-jsi',
    'react-native',
    'react',
  ]) {
    const packageFile = expoRequire.resolve(`${name}/package.json`);
    const pkg = readJson(packageFile);
    const expected = requireVersion(versions, name);
    if (pkg.version !== expected) {
      fail(`${name} must be ${expected}, found ${pkg.version}`);
    }
    packages[name] = { root: path.dirname(packageFile), version: pkg.version };
  }

  const hermesFile = path.join(
    packages['react-native'].root,
    'sdks',
    '.hermesv1version'
  );
  if (!fs.existsSync(hermesFile))
    fail(`React Native Hermes version file is missing: ${hermesFile}`);
  const hermesVersion = fs.readFileSync(hermesFile, 'utf8').trim();
  if (hermesVersion !== versions.hermes) {
    fail(
      `React Native Hermes must be ${versions.hermes}, found ${hermesVersion}`
    );
  }

  const coreFingerprint = treeFingerprint(packages['expo-modules-core'].root, [
    'ios',
    'common/cpp',
  ]);
  if (coreFingerprint.sha256 !== expectedCoreSourceFingerprint) {
    fail(
      `expo-modules-core source fingerprint mismatch; expected ${expectedCoreSourceFingerprint}, found ${coreFingerprint.sha256}`
    );
  }
  return { packages, coreFingerprint, hermesVersion };
}

function occurrences(source, marker) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(marker, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + marker.length;
  }
}

function assertExactlyOnce(source, marker, label) {
  const count = occurrences(source, marker);
  if (count !== 1) fail(`${label} must occur exactly once; found ${count}`);
  return source.indexOf(marker);
}

function copyFile(sourceRoot, relative, transforms) {
  const source = path.join(sourceRoot, relative);
  const destination = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  let contents = fs.readFileSync(source, 'utf8');
  if (transforms[relative]) contents = transforms[relative](contents);
  // Keep generated text free of a trailing blank line so the checked-in
  // artifact passes repository whitespace validation without changing content.
  contents = contents.replace(/\n{2,}$/u, '\n');
  fs.writeFileSync(destination, contents);
}

function removeRange(source, start, end, label) {
  const startIndex = assertExactlyOnce(source, start, `${label} start marker`);
  const endIndex = assertExactlyOnce(source, end, `${label} end marker`);
  if (endIndex <= startIndex)
    fail(`${label} end marker precedes its start marker`);
  return source.slice(0, startIndex) + source.slice(endIndex);
}

function replaceOnce(source, before, after, label) {
  const index = assertExactlyOnce(source, before, label);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`;
  const matches = [...source.matchAll(new RegExp(pattern.source, flags))];
  if (matches.length !== 1) {
    fail(`${label} must occur exactly once; found ${matches.length}`);
  }
  return source.replace(pattern, replacement);
}

function truncateAtMarker(source, marker, label) {
  const index = assertExactlyOnce(source, marker, label);
  return source.slice(0, index);
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
  const registrationIndex = assertExactlyOnce(
    source,
    registrationStart,
    'module registration section'
  );
  const runtimeIndex = assertExactlyOnce(
    source,
    runtimeMarker,
    'runtime section'
  );
  if (runtimeIndex <= registrationIndex)
    fail('runtime section precedes registration');
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
  source = replaceOnce(
    source,
    'Sets the JavaScript runtime from raw pointers. Called by `ExpoReactNativeFactory`\n   when React Native initializes the runtime.',
    'Sets the JavaScript runtime from raw pointers supplied by the host.',
    'runtime documentation'
  );
  source = replaceOnce(
    source,
    '   `scheduler` is an opaque handle that `dispatch` understands; the factories pass\n   a handle created by `expo::createReactSchedulerHandle` that references the React\n   runtime scheduler weakly (see `EXReactSchedulerDispatch.h`).',
    '   `scheduler` is an opaque, host-owned handle that `dispatch` understands.',
    'scheduler documentation'
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
  source = replaceOnce(
    source,
    'internal import React\n',
    '',
    'CoreModule React import'
  );
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
  source = truncateAtMarker(
    source,
    'internal final class WorkletUIRuntimeException',
    'worklet exception type'
  );
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
  source = replaceRegexOnce(
    source,
    /^\/\*\*\n (?:Asynchronous function|Synchronous function) from an optimized function descriptor\.\n The descriptor is produced by `@OptimizedFunction` macro-generated peer functions\.\n \*\/\n/,
    '',
    `optimized ${name} factory documentation`
  );
  const optimizedMarker =
    'public func ' +
    (name === 'async' ? 'AsyncFunction' : 'Function') +
    '(\n  _ name: String,\n  _ descriptor: OptimizedFunctionDescriptor';
  const start = assertExactlyOnce(
    source,
    optimizedMarker,
    `optimized ${name} factory`
  );
  const nextDoc = source.indexOf('/**', start + optimizedMarker.length);
  if (nextDoc < 0) fail(`cannot find normal ${name} factory`);
  if (source.indexOf('/**', nextDoc + 1) < 0) {
    fail(`cannot verify normal ${name} factory boundary`);
  }
  return source.slice(0, start) + source.slice(nextDoc);
}

function transformInstallerHeader(source) {
  source = replaceRegexOnce(
    source,
    /#if !__building_module\(ExpoModulesCore\)[\s\S]*?#endif\n\n/,
    '',
    'installer module import guard'
  );
  source = replaceRegexOnce(
    source,
    /#if __has_include\(<ReactCommon\/RCTRuntimeExecutor.h>\)[\s\S]*?#endif[^\n]*\n\n/,
    '',
    'installer React runtime executor guard'
  );
  return '#import <Foundation/Foundation.h>\n\n' + source;
}

function transformInstallerImplementation(source) {
  source = replaceOnce(
    source,
    '#import <ExpoModulesCore/BridgelessJSCallInvoker.h>\n',
    '',
    'bridgeless call invoker import'
  );
  source = replaceOnce(
    source,
    '#import <ExpoModulesCore/EXAppContextProtocol.h>\n',
    '',
    'app context protocol import'
  );
  source = replaceOnce(
    source,
    '#import <react/renderer/runtimescheduler/RuntimeScheduler.h>\n',
    '',
    'React runtime scheduler import'
  );
  return replaceOnce(
    source,
    '#import <react/renderer/runtimescheduler/RuntimeSchedulerBinding.h>\n',
    '',
    'React runtime scheduler binding import'
  );
}

function transformUtilities(source) {
  const marker =
    '/**\n A collection of utility functions for various Expo Modules common tasks.';
  return truncateAtMarker(source, marker, 'UI Utilities API');
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
  return truncateAtMarker(source, marker, 'persistent log handler');
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
  const startMarker = '  @objc\n  public func setRuntime(\n';
  const endMarker = '\n  @JavaScriptActor\n  internal func prepareRuntime()';
  const start = assertExactlyOnce(
    source,
    startMarker,
    'setRuntime implementation'
  );
  const end = assertExactlyOnce(
    source,
    endMarker,
    'prepareRuntime implementation'
  );
  if (end <= start) fail('prepareRuntime precedes setRuntime');
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

function buildManifest(versions, sourceFingerprint, copied) {
  const files = copied.sort().map((relative) => {
    const contents = fs.readFileSync(path.join(outputRoot, relative));
    return { path: relative, sha256: sha256(contents) };
  });
  const licensePath = path.join(
    outputRoot,
    'LICENSES',
    'ExpoModulesCore-LICENSE'
  );
  return {
    schema: 1,
    generatedBy: generatorId,
    generatorSha256: sha256(fs.readFileSync(__filename)),
    versions,
    source: {
      package: 'expo-modules-core',
      sourceFingerprint,
      sourceDirectories: ['ios', 'common/cpp'],
      license: {
        path: 'LICENSES/ExpoModulesCore-LICENSE',
        sha256: sha256(fs.readFileSync(licensePath)),
      },
    },
    files,
  };
}

function copyLicense(coreRoot) {
  const source = path.join(coreRoot, 'LICENSE');
  if (!fs.existsSync(source))
    fail(`Expo Modules Core license is missing: ${source}`);
  const relative = 'LICENSES/ExpoModulesCore-LICENSE';
  const destination = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return relative;
}

function generateInto(projectRoot, destination, versions) {
  const previousOutputRoot = outputRoot;
  outputRoot = destination;
  try {
    const { packages, coreFingerprint } = resolvePackages(
      projectRoot,
      versions
    );
    const coreRoot = packages['expo-modules-core'].root;
    fs.mkdirSync(outputRoot, { recursive: true });
    const transforms = {
      'ios/Core/Modules/ModuleDefinition.swift': transformModuleDefinition,
      'ios/Core/Modules/CoreModule.swift': transformCoreModule,
      'ios/Core/ModulesProvider.swift': transformModulesProvider,
      'ios/Core/Functions/AsyncFunctionDefinition.swift':
        transformAsyncFunction,
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
    copied.push(
      'ios/ExpoModulesCore.h',
      'ios/module.modulemap',
      copyLicense(coreRoot)
    );
    const manifest = buildManifest(versions, coreFingerprint, copied);
    fs.writeFileSync(
      path.join(outputRoot, 'overlay-manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n'
    );
    return manifest;
  } finally {
    outputRoot = previousOutputRoot;
  }
}

function randomSuffix() {
  return `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
}

function relativeFiles(root) {
  return walk(root)
    .map((file) => path.relative(root, file))
    .sort((left, right) => left.localeCompare(right));
}

function assertDirectoriesEqual(actualRoot, expectedRoot) {
  const actualFiles = relativeFiles(actualRoot);
  const expectedFiles = relativeFiles(expectedRoot);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    fail(`generated overlay file inventory is stale: ${actualRoot}`);
  }
  for (const relative of expectedFiles) {
    const actual = fs.readFileSync(path.join(actualRoot, relative));
    const expected = fs.readFileSync(path.join(expectedRoot, relative));
    if (!actual.equals(expected)) {
      fail(
        `generated overlay file is stale: ${path.join(actualRoot, relative)}`
      );
    }
  }
}

function replaceAtomically(tempOutput, destination) {
  const backup = `${destination}.previous-${randomSuffix()}`;
  const hadDestination = fs.existsSync(destination);
  try {
    if (hadDestination) fs.renameSync(destination, backup);
    fs.renameSync(tempOutput, destination);
    if (hadDestination) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (
      !fs.existsSync(destination) &&
      hadDestination &&
      fs.existsSync(backup)
    ) {
      fs.renameSync(backup, destination);
    }
    throw error;
  } finally {
    fs.rmSync(tempOutput, { recursive: true, force: true });
    fs.rmSync(backup, { recursive: true, force: true });
  }
}

function generateOverlay({ projectRoot, destination, versions, check }) {
  const tempOutput = `${destination}.tmp-${randomSuffix()}`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try {
    const manifest = generateInto(projectRoot, tempOutput, versions);
    if (check) {
      if (!fs.existsSync(destination)) {
        fail(`overlay has not been generated at ${destination}`);
      }
      assertDirectoriesEqual(destination, tempOutput);
      return manifest;
    }
    replaceAtomically(tempOutput, destination);
    return manifest;
  } finally {
    fs.rmSync(tempOutput, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const options = {
    projectRoot: process.cwd(),
    destination: defaultOutputRoot,
    versionsFile,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') options.check = true;
    else if (
      argument === '--project-root' ||
      argument === '--output' ||
      argument === '--versions-file'
    ) {
      const value = argv[index + 1];
      if (!value) fail(`${argument} requires a value`);
      index += 1;
      if (argument === '--project-root')
        options.projectRoot = path.resolve(value);
      else if (argument === '--output')
        options.destination = path.resolve(value);
      else options.versionsFile = path.resolve(value);
    } else if (argument === '--help') {
      console.log(
        'Usage: generate-overlay.cjs [--project-root <path>] [--output <path>] [--versions-file <path>] [--check]'
      );
      process.exit(0);
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const versions = loadVersions(options.versionsFile);
  const manifest = generateOverlay({
    projectRoot: options.projectRoot,
    destination: options.destination,
    versions,
    check: options.check,
  });
  if (!options.check) {
    console.log(
      `Generated ${manifest.files.length} Expo Modules Core overlay files in ${options.destination}`
    );
  }
}

module.exports = {
  assertDirectoriesEqual,
  assertExactlyOnce,
  generateOverlay,
  loadVersions,
  parseArgs,
  replaceAtomically,
  resolvePackages,
  treeFingerprint,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
