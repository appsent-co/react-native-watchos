#!/usr/bin/env node
'use strict';

// Builds a consumer from the packed npm artifact. It deliberately never points
// the consumer at this checkout, a workspace symlink, or node_modules here.
// Run only after `pnpm build:xcframework` and `pnpm build:expo-modules` finish.

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repositoryRoot = path.resolve(__dirname, '..');
const fixtureRoot = path.join(
  repositoryRoot,
  'tests',
  'fixtures',
  'expo-module'
);
const defaultWorkdir = path.join(repositoryRoot, 'build', 'test-expo-consumer');
const packageManagerVersion = '10.10.0';
const workdirMarker = '.rnw-expo-consumer-gate.json';
const versions = require(
  path.join(repositoryRoot, 'expo-modules', 'versions.json')
);

function fail(message) {
  throw new Error(`[RNW Expo consumer] ${message}`);
}

function childEnvironment(extra = {}) {
  return {
    ...process.env,
    PATH: `${path.dirname(process.execPath)}:${process.env.PATH || ''}`,
    ...extra,
  };
}

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd || repositoryRoot,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: childEnvironment(options.env),
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
  });
  if (result.error) fail(`could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    fail(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
  }
  return result.stdout || '';
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function writeJson(file, value) {
  write(file, JSON.stringify(value, null, 2) + '\n');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertExists(file, label = file) {
  if (!fs.existsSync(file)) fail(`missing ${label}`);
}

function assertIncludes(contents, expected, label) {
  if (!contents.includes(expected))
    fail(`${label} does not contain ${expected}`);
}

function assertNotIncludes(contents, unexpected, label) {
  if (contents.includes(unexpected))
    fail(`${label} unexpectedly contains ${unexpected}`);
}

function parseArgs(argv) {
  const options = { phase: 'all', workdir: defaultWorkdir, tarball: null };
  const phases = new Set([
    'prepare',
    'install',
    'prebuild',
    'verify',
    'build',
    'run',
    'all',
  ]);
  let phaseSeen = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--tarball' || argument === '--workdir') {
      const value = argv[index + 1];
      if (!value) fail(`${argument} requires a value`);
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
    } else if (!phaseSeen && phases.has(argument)) {
      options.phase = argument;
      phaseSeen = true;
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function pnpm(args, options = {}) {
  return run(
    'npx',
    ['--yes', `pnpm@${packageManagerVersion}`, ...args],
    options
  );
}

function assertTools() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    fail(`requires Node 22.13 or newer, found ${process.version}`);
  }
  const pnpmVersion = pnpm(['--version']).trim();
  if (pnpmVersion !== packageManagerVersion) {
    fail(`requires pnpm ${packageManagerVersion}, found ${pnpmVersion}`);
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function assertSafeWorkdir(workdir) {
  const resolved = path.resolve(workdir);
  const repositoryBuild = path.join(
    repositoryRoot,
    'build',
    'test-expo-consumer'
  );
  const temporaryRoot = '/private/tmp';
  const temporaryName = path.basename(resolved);
  const generatedTemporary =
    isInside(temporaryRoot, resolved) &&
    (temporaryName.startsWith('rnw-expo-consumer-') ||
      temporaryName.startsWith('rnw-expo-release-consumer-'));
  if (resolved !== repositoryBuild && !generatedTemporary) {
    fail(`refusing to reset unsafe workdir: ${resolved}`);
  }
  return resolved;
}

function resetWorkdir(workdir) {
  const resolved = assertSafeWorkdir(workdir);
  if (fs.existsSync(resolved)) {
    const marker = path.join(resolved, workdirMarker);
    const entries = fs.readdirSync(resolved);
    if (entries.length > 0 && !fs.existsSync(marker)) {
      fail(
        `refusing to erase nonempty workdir without ${workdirMarker}: ${resolved}`
      );
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  fs.mkdirSync(resolved, { recursive: true });
  writeJson(path.join(resolved, workdirMarker), {
    generator: 'scripts/test-expo-consumer.cjs',
    schema: 1,
  });
  return resolved;
}

function tail(file, lines = 80) {
  return fs.readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n');
}

function runLogged(command, args, logFile, options = {}) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const descriptor = fs.openSync(logFile, 'w');
  try {
    const result = childProcess.spawnSync(command, args, {
      cwd: options.cwd || repositoryRoot,
      env: childEnvironment(options.env),
      stdio: ['ignore', descriptor, descriptor],
    });
    if (result.error)
      fail(`could not start ${command}: ${result.error.message}`);
    if (result.status !== 0) {
      fail(
        `${command} ${args.join(' ')} failed; log: ${logFile}\n${tail(logFile)}`
      );
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function baconVersion() {
  const packageFile = require.resolve('@bacons/apple-targets/package.json', {
    paths: [repositoryRoot],
  });
  return readJson(packageFile).version;
}

function packArtifact(outputRoot, explicitTarball) {
  if (explicitTarball) {
    assertExists(explicitTarball, 'requested npm tarball');
    return explicitTarball;
  }
  const packDir = path.join(outputRoot, 'tarball');
  fs.mkdirSync(packDir, { recursive: true });
  const output = run('npm', ['pack', '--json', '--pack-destination', packDir], {
    cwd: repositoryRoot,
  });
  // Lifecycle scripts may print status before npm's JSON response. npm places
  // the pack response last, on a line beginning with `[`. Keep that status out
  // of the parser while still failing if the promised JSON is absent.
  const trimmedOutput = output.trim();
  const jsonStart = trimmedOutput.lastIndexOf('\n[');
  const json =
    jsonStart >= 0 ? trimmedOutput.slice(jsonStart + 1) : trimmedOutput;
  if (!json.startsWith('[')) {
    fail(`npm pack did not emit a JSON response: ${trimmedOutput}`);
  }
  const response = JSON.parse(json);
  if (
    !Array.isArray(response) ||
    response.length !== 1 ||
    !response[0].filename
  ) {
    fail('npm pack did not return one tarball');
  }
  const tarball = path.join(packDir, response[0].filename);
  assertExists(tarball, 'npm pack tarball');
  return tarball;
}

function inspectTarball(tarball) {
  const files = run('tar', ['-tzf', tarball]).split('\n').filter(Boolean);
  const required = [
    'package/ReactNativeWatchOSExpo.podspec',
    'package/cocoapods/autolink.rb',
    'package/expo-modules/autolinking.cjs',
    'package/expo-modules/build-manifest.json',
    'package/expo-modules/core/RNWExpoModulesCore.podspec',
    'package/expo-modules/core/build/ExpoModulesCore/overlay-manifest.json',
    'package/expo-modules/jsi/RNWExpoModulesJSI.podspec',
    'package/expo-modules/jsi/build/ExpoModulesJSI.xcframework/Info.plist',
    'package/build/xcframework/ReactNativeWatchOSCxx.xcframework/Info.plist',
  ];
  for (const requiredFile of required) {
    if (!files.includes(requiredFile))
      fail(`npm tarball is missing ${requiredFile}`);
  }
  const frameworkBinaries = files.filter((file) =>
    file.endsWith('/ExpoModulesJSI.framework/ExpoModulesJSI')
  );
  if (frameworkBinaries.length < 2) {
    fail(
      'npm tarball is missing device or simulator ExpoModulesJSI framework slices'
    );
  }
  for (const infoFile of [
    'package/expo-modules/jsi/build/ExpoModulesJSI.xcframework/Info.plist',
    'package/build/xcframework/ReactNativeWatchOSCxx.xcframework/Info.plist',
  ]) {
    const plist = run('tar', ['-xOf', tarball, infoFile]);
    for (const architecture of ['watchos', 'arm64', 'arm64_32']) {
      assertIncludes(plist, architecture, `${infoFile} architectures`);
    }
  }
}

function writeAppConfig(consumerRoot, enabled) {
  const plugin = [
    '@appsent-co/react-native-watchos',
    { targetName: 'watch', expoModules: enabled },
  ];
  writeJson(path.join(consumerRoot, 'app.json'), {
    expo: {
      name: 'RNW Expo Consumer',
      slug: 'rnw-expo-consumer',
      version: '1.0.0',
      ios: { bundleIdentifier: 'com.appsent.rnwexpoconsumer' },
      plugins: ['@bacons/apple-targets', plugin],
    },
  });
}

function appFiles(consumerRoot, enabled) {
  writeAppConfig(consumerRoot, enabled);
  writeJson(
    path.join(consumerRoot, 'targets', 'watch', 'expo-target.config.json'),
    {
      type: 'watch',
    }
  );
  write(
    path.join(consumerRoot, 'targets', 'watch', 'index.swift'),
    `import SwiftUI\n\n@main\nstruct WatchEntry: App {\n  var body: some Scene {\n    WindowGroup { ContentView() }\n  }\n}\n`
  );
  write(
    path.join(consumerRoot, 'targets', 'watch', 'ContentView.swift'),
    `import Foundation\nimport SwiftUI\nimport ReactNativeWatchOS\n\nstruct ContentView: View {\n  @StateObject private var host = ReactNativeWatchOSHost()\n\n  var body: some View {\n    Color.clear\n      .task {\n        host.onConsoleLog = { level, message in\n          if level == .error {\n            writeResult(success: false, message: message)\n          } else if message == "RNW_EXPO_CONSUMER_PASS:42" {\n            writeResult(success: true, message: message)\n          }\n        }\n        guard let bundleURL = ReactNativeWatchOSHost.releaseBundleURL() else {\n          writeResult(success: false, message: "main.jsbundle is missing")\n          return\n        }\n        do {\n          try await host.loadBundle(from: bundleURL)\n        } catch {\n          writeResult(success: false, message: String(describing: error))\n        }\n      }\n  }\n\n  private func writeResult(success: Bool, message: String) {\n    let payload: [String: Any] = [\n      "success": success,\n      "answer": success ? 42 : 0,\n      "message": message\n    ]\n    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys]),\n          let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {\n      return\n    }\n    try? data.write(to: documents.appendingPathComponent("rnw-expo-consumer-result.json"), options: .atomic)\n  }\n}\n`
  );
  write(
    path.join(consumerRoot, 'targets', 'watch', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>CFBundleDisplayName</key><string>Consumer Watch</string><key>CFBundleIdentifier</key><string>com.appsent.rnwexpoconsumer.watch</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>\n`
  );
  write(
    path.join(consumerRoot, 'metro.config.js'),
    `const { getDefaultConfig } = require('expo/metro-config');\nconst { withWatchosMetro } = require('@appsent-co/react-native-watchos/metro-config');\nmodule.exports = withWatchosMetro(getDefaultConfig(__dirname));\n`
  );
  write(
    path.join(consumerRoot, 'index.js'),
    `import { AppRegistry, Text } from 'react-native';\nAppRegistry.registerComponent('RNWExpoConsumer', () => () => <Text>iPhone consumer</Text>);\n`
  );
  write(
    path.join(consumerRoot, 'index.watchos.js'),
    `import '@appsent-co/react-native-watchos/polyfills';\nimport fixture from '@rnw-test/expo-module';\nconst answer = fixture.answer();\nif (answer === 42) {\n  console.log('RNW_EXPO_CONSUMER_PASS:42');\n} else {\n  console.error('RNW_EXPO_CONSUMER_FAIL:' + String(answer));\n}\n`
  );
  write(
    path.join(consumerRoot, 'src', 'specs', 'NativeUnrelated.js'),
    `import type { TurboModule } from 'react-native';\nimport { TurboModuleRegistry } from 'react-native';\nexport interface Spec extends TurboModule { ping(): string; }\nexport default TurboModuleRegistry.getEnforcing<Spec>('Unrelated');\n`
  );
}

function prepare(options) {
  assertTools();
  const workdir = resetWorkdir(options.workdir);
  const tarball = packArtifact(workdir, options.tarball);
  inspectTarball(tarball);
  const consumerRoot = path.join(workdir, 'consumer');
  fs.mkdirSync(consumerRoot, { recursive: true });
  fs.cpSync(fixtureRoot, path.join(consumerRoot, 'fixture'), {
    recursive: true,
  });
  writeJson(path.join(consumerRoot, 'package.json'), {
    name: 'rnw-expo-consumer',
    version: '1.0.0',
    private: true,
    main: 'index.js',
    packageManager: `pnpm@${packageManagerVersion}`,
    dependencies: {
      '@appsent-co/react-native-watchos': `file:${tarball}`,
      '@bacons/apple-targets': baconVersion(),
      '@rnw-test/expo-module': 'file:./fixture',
      'expo': versions.expo,
      'react': versions.react,
      'react-native': versions['react-native'],
    },
    codegenConfig: {
      name: 'UnrelatedSpecs',
      type: 'modules',
      jsSrcsDir: 'src/specs',
      outputDir: { ios: 'ios/build/generated/watchos-codegen' },
    },
  });
  appFiles(consumerRoot, true);
  writeJson(path.join(workdir, 'gate.json'), { tarball, consumerRoot });
}

function gateState(options) {
  const file = path.join(options.workdir, 'gate.json');
  assertExists(file, 'gate state; run prepare first');
  const state = readJson(file);
  assertExists(state.tarball, 'gate tarball');
  assertExists(state.consumerRoot, 'consumer project');
  return state;
}

function install(options) {
  assertTools();
  const { consumerRoot } = gateState(options);
  const lockfile = path.join(consumerRoot, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfile)) {
    pnpm(['install', '--lockfile-only'], { cwd: consumerRoot });
  }
  pnpm(['install', '--frozen-lockfile'], { cwd: consumerRoot });
}

function expo(consumerRoot, args) {
  const expoBin = path.join(consumerRoot, 'node_modules', '.bin', 'expo');
  assertExists(expoBin, 'consumer Expo CLI');
  run(expoBin, args, { cwd: consumerRoot });
}

function providerPath(consumerRoot) {
  return path.join(
    consumerRoot,
    'ios',
    'build',
    'generated',
    'rnw-expo',
    'watch',
    'RNWExpoModulesProvider.swift'
  );
}

function projectPath(consumerRoot) {
  const projects = fs
    .readdirSync(path.join(consumerRoot, 'ios'))
    .filter((entry) => entry.endsWith('.xcodeproj'));
  if (projects.length !== 1)
    fail('Expo prebuild must produce exactly one iOS project');
  return path.join(consumerRoot, 'ios', projects[0], 'project.pbxproj');
}

function sourceTargets(consumerRoot, sourceBasename) {
  const packageFile = require.resolve(
    '@appsent-co/react-native-watchos/package.json',
    {
      paths: [consumerRoot],
    }
  );
  const packageRequire = createRequire(packageFile);
  const xcode = packageRequire('xcode');
  const project = xcode.project(projectPath(consumerRoot));
  project.parseSync();
  const objects = project.hash.project.objects;
  const sourceRefs = new Set(
    Object.entries(objects.PBXFileReference || {})
      .filter(
        ([key, value]) =>
          !key.endsWith('_comment') &&
          path.basename(String(value.path || '').replace(/^"|"$/g, '')) ===
            sourceBasename
      )
      .map(([key]) => key)
  );
  const buildRefs = new Set(
    Object.entries(objects.PBXBuildFile || {})
      .filter(
        ([key, value]) =>
          !key.endsWith('_comment') && sourceRefs.has(value.fileRef)
      )
      .map(([key]) => key)
  );
  const targets = objects.PBXNativeTarget || {};
  return Object.entries(targets)
    .filter(([key]) => !key.endsWith('_comment'))
    .filter(([, target]) =>
      (target.buildPhases || []).some((phaseReference) => {
        const phase = objects.PBXSourcesBuildPhase?.[phaseReference.value];
        return (phase?.files || []).some((fileReference) =>
          buildRefs.has(fileReference.value)
        );
      })
    )
    .map(([key, target]) => targets[`${key}_comment`] || target.name)
    .map((name) => String(name).replace(/^"|"$/g, ''));
}

function assertEnabledPrebuild(consumerRoot) {
  const provider = providerPath(consumerRoot);
  assertExists(provider, 'generated Expo provider');
  const contents = fs.readFileSync(provider, 'utf8');
  assertIncludes(contents, 'import RNWFixtureExpoModule', 'generated provider');
  assertIncludes(
    contents,
    'RNWFixtureExpoModule.FixtureExpoModule.self',
    'generated provider'
  );
  const targets = sourceTargets(consumerRoot, 'RNWExpoModulesProvider.swift');
  if (targets.length !== 1 || targets[0] !== 'watch') {
    fail(
      `Expo provider must compile only in watch; found ${targets.join(', ') || 'no target'}`
    );
  }
  const plist = fs.readFileSync(
    path.join(consumerRoot, 'targets', 'watch', 'Info.plist'),
    'utf8'
  );
  assertIncludes(plist, 'RNWRuntimeBindingFactory', 'watch Info.plist');
  assertIncludes(plist, 'RNWExpoRuntimeBindingFactory', 'watch Info.plist');
  const pods = fs.readFileSync(
    path.join(consumerRoot, 'targets', 'watch', 'pods.rb'),
    'utf8'
  );
  assertIncludes(pods, ':expo_modules => true', 'watch pods.rb');
  assertExists(
    path.join(consumerRoot, 'ios', 'build', 'generated', 'watchos-codegen'),
    'unrelated watch TurboModule codegen output'
  );
}

function assertDisabledPrebuild(consumerRoot) {
  if (fs.existsSync(providerPath(consumerRoot)))
    fail('disabled prebuild retained Expo provider');
  const plist = fs.readFileSync(
    path.join(consumerRoot, 'targets', 'watch', 'Info.plist'),
    'utf8'
  );
  assertNotIncludes(plist, 'RNWRuntimeBindingFactory', 'watch Info.plist');
  const pods = fs.readFileSync(
    path.join(consumerRoot, 'targets', 'watch', 'pods.rb'),
    'utf8'
  );
  assertIncludes(pods, ':expo_modules => false', 'watch pods.rb');
  assertNotIncludes(pods, ':expo_modules => true', 'disabled watch pods.rb');
}

function prebuild(options) {
  assertTools();
  const { consumerRoot } = gateState(options);
  // A previous interrupted toggle can leave app.json disabled. Each phase is
  // independently repeatable, so always begin from the enabled release state.
  writeAppConfig(consumerRoot, true);
  expo(consumerRoot, ['prebuild', '--platform', 'ios', '--no-install']);
  assertEnabledPrebuild(consumerRoot);
  writeAppConfig(consumerRoot, false);
  expo(consumerRoot, ['prebuild', '--platform', 'ios', '--no-install']);
  assertDisabledPrebuild(consumerRoot);
  writeAppConfig(consumerRoot, true);
  expo(consumerRoot, ['prebuild', '--platform', 'ios', '--no-install']);
  assertEnabledPrebuild(consumerRoot);
}

function verifyInstalledPackage(consumerRoot) {
  const packageFile = require.resolve(
    '@appsent-co/react-native-watchos/package.json',
    {
      paths: [consumerRoot],
    }
  );
  const installedRoot = path.dirname(packageFile);
  run(process.execPath, ['scripts/verify-package.cjs'], { cwd: installedRoot });
}

function verify(options) {
  const { tarball, consumerRoot } = gateState(options);
  inspectTarball(tarball);
  verifyInstalledPackage(consumerRoot);
  assertEnabledPrebuild(consumerRoot);
}

function build(options) {
  assertTools();
  const { consumerRoot } = gateState(options);
  const logs = path.join(options.workdir, 'logs');
  runLogged(
    process.env.POD_BINARY || 'pod',
    ['install', '--project-directory=ios'],
    path.join(logs, 'pod-install.log'),
    { cwd: consumerRoot }
  );
  const lock = fs.readFileSync(
    path.join(consumerRoot, 'ios', 'Podfile.lock'),
    'utf8'
  );
  for (const pod of [
    'ExpoModulesCore',
    'RNWExpoModulesCore',
    'RNWExpoModulesJSI',
    'ReactNativeWatchOSExpo',
  ]) {
    assertIncludes(lock, pod, 'combined iPhone/watch Podfile.lock');
  }
  const workspaces = fs
    .readdirSync(path.join(consumerRoot, 'ios'))
    .filter((entry) => entry.endsWith('.xcworkspace'));
  if (workspaces.length !== 1)
    fail('pod install must produce one consumer workspace');
  const workspace = path.join(consumerRoot, 'ios', workspaces[0]);
  const appScheme = path.basename(
    path.dirname(projectPath(consumerRoot)),
    '.xcodeproj'
  );
  const derivedData = path.join(consumerRoot, 'build', 'ConsumerDerivedData');
  runLogged(
    'xcodebuild',
    [
      '-workspace',
      workspace,
      '-scheme',
      appScheme,
      '-configuration',
      'Release',
      '-destination',
      'generic/platform=iOS Simulator',
      '-derivedDataPath',
      derivedData,
      'ARCHS=arm64',
      'ONLY_ACTIVE_ARCH=YES',
      'CODE_SIGNING_ALLOWED=NO',
      'build',
    ],
    path.join(logs, 'iphone-release-build.log'),
    { cwd: consumerRoot }
  );
  const products = path.join(derivedData, 'Build', 'Products');
  const iPhoneApp = path.join(
    products,
    'Release-iphonesimulator',
    `${appScheme}.app`
  );
  const watchApp = path.join(products, 'Release-watchsimulator', 'watch.app');
  if (!fs.existsSync(iPhoneApp)) fail(`missing built iPhone app: ${iPhoneApp}`);
  if (!fs.existsSync(watchApp)) fail(`missing built watch app: ${watchApp}`);
  const releaseBundle = path.join(watchApp, 'main.jsbundle');
  assertExists(releaseBundle, 'release watch JavaScript bundle');
  const hermesMagic = Buffer.from([0xc6, 0x1f, 0xbc, 0x03]);
  if (!fs.readFileSync(releaseBundle).subarray(0, 4).equals(hermesMagic)) {
    fail(`release watch bundle is not Hermes bytecode: ${releaseBundle}`);
  }
}

function selectedWatchSimulator() {
  const inventory = JSON.parse(
    run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])
  );
  const watches = Object.entries(inventory.devices)
    .filter(([runtime]) => runtime.includes('.watchOS-'))
    .flatMap(([, devices]) => devices)
    .filter((device) => device.isAvailable !== false);
  const requested = process.env.RNW_EXPO_SIMULATOR_UDID?.toLowerCase();
  const simulator = requested
    ? watches.find((device) => device.udid.toLowerCase() === requested)
    : watches.find((device) => device.state === 'Booted');
  if (!simulator) {
    fail(
      requested
        ? 'RNW_EXPO_SIMULATOR_UDID does not identify an available watchOS simulator'
        : 'boot a watchOS simulator or set RNW_EXPO_SIMULATOR_UDID'
    );
  }
  return simulator;
}

function runIgnoringFailure(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd || repositoryRoot,
    encoding: 'utf8',
    env: childEnvironment(options.env),
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) fail(`could not start ${command}: ${result.error.message}`);
}

function pause(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function runRuntime(options) {
  const { consumerRoot } = gateState(options);
  const appPath = path.join(
    consumerRoot,
    'build',
    'ConsumerDerivedData',
    'Build',
    'Products',
    'Release-watchsimulator',
    'watch.app'
  );
  assertExists(appPath, 'release watch app; run build first');
  const simulator = selectedWatchSimulator();
  run('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b']);
  run('xcrun', ['simctl', 'install', simulator.udid, appPath]);
  const appID = 'com.appsent.rnwexpoconsumer.watch';
  runIgnoringFailure('xcrun', ['simctl', 'terminate', simulator.udid, appID]);
  const appData = run('xcrun', [
    'simctl',
    'get_app_container',
    simulator.udid,
    appID,
    'data',
  ]).trim();
  const resultFile = path.join(
    appData,
    'Documents',
    'rnw-expo-consumer-result.json'
  );
  const copiedResult = path.join(options.workdir, 'result.json');
  fs.rmSync(resultFile, { force: true });
  fs.rmSync(copiedResult, { force: true });
  run('xcrun', ['simctl', 'launch', simulator.udid, appID]);
  const timeout = Number(process.env.RNW_EXPO_TIMEOUT_SECONDS || '60');
  if (!Number.isInteger(timeout) || timeout < 1) {
    fail('RNW_EXPO_TIMEOUT_SECONDS must be a positive integer');
  }
  const deadline = Date.now() + timeout * 1000;
  while (Date.now() < deadline) {
    if (fs.existsSync(resultFile) && fs.statSync(resultFile).size > 0) {
      let result;
      try {
        result = readJson(resultFile);
      } catch {
        pause(250);
        continue;
      }
      writeJson(copiedResult, result);
      if (result?.success !== true || result?.answer !== 42) {
        fail(`release watch runtime failed; result: ${copiedResult}`);
      }
      return;
    }
    pause(250);
  }
  fail(`timed out waiting for release watch runtime result: ${resultFile}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.phase === 'prepare') return prepare(options);
  if (options.phase === 'install') return install(options);
  if (options.phase === 'prebuild') return prebuild(options);
  if (options.phase === 'verify') return verify(options);
  if (options.phase === 'build') return build(options);
  if (options.phase === 'run') return runRuntime(options);
  prepare(options);
  install(options);
  prebuild(options);
  verify(options);
  build(options);
  runRuntime(options);
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
