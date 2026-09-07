#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const plist = require('@expo/plist').default;
const {
  versions,
  resolveNativeBuild,
} = require('../expo-modules/compatibility.cjs');
const root = path.resolve(__dirname, '..');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const artifactDirectories = [
  'build/xcframework',
  'expo-modules/core/build',
  'expo-modules/jsi/build',
];

function inventory(directory) {
  const result = {};
  function visit(relative) {
    for (const entry of fs
      .readdirSync(path.join(root, relative), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) visit(file);
      else if (entry.isSymbolicLink())
        throw new Error(
          `Cannot publish symlink ${file}; copy its target into the package.`
        );
      else if (entry.isFile()) result[file] = hash(read(file));
    }
  }
  visit(directory);
  return result;
}
function sourceHash() {
  return hash(
    JSON.stringify({
      ...inventory('apple/Sources/ReactNativeWatchOSCxx'),
      ...inventory('cmake'),
      'scripts/build-xcframework.sh': hash(
        read('scripts/build-xcframework.sh')
      ),
      'scripts/build-hermes-watchos.sh': hash(
        read('scripts/build-hermes-watchos.sh')
      ),
      'scripts/patch-hermes-watchos.sh': hash(
        read('scripts/patch-hermes-watchos.sh')
      ),
    })
  );
}
function portInputs() {
  return Object.fromEntries(
    [
      'expo-modules/versions.json',
      'expo-modules/prepare.cjs',
      'expo-modules/patches/expo-modules-core+57.0.16.patch',
      'expo-modules/patches/expo-modules-jsi+57.0.8.patch',
      'scripts/build-expo-modules.sh',
      'expo-modules/compatibility.cjs',
      'expo-modules/core/RNWExpoModulesCore.podspec',
      'expo-modules/core/ExpoModulesCore.h',
      'expo-modules/jsi/RNWExpoModulesJSI.podspec',
    ].map((file) => [file, hash(read(file))])
  );
}
function write(relative, value) {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(
    path.join(root, relative),
    JSON.stringify(value, null, 2) + '\n'
  );
}
function checkSlices(relative) {
  const info = plist.parse(read(`${relative}/Info.plist`).toString());
  for (const [variant, architectures] of [
    ['simulator', ['arm64']],
    ['', ['arm64', 'arm64_32']],
  ]) {
    const slice = info.AvailableLibraries.find(
      (library) =>
        library.SupportedPlatform === 'watchos' &&
        (library.SupportedPlatformVariant || '') === variant
    );
    if (
      !slice ||
      architectures.some(
        (architecture) => !slice.SupportedArchitectures.includes(architecture)
      )
    )
      throw new Error(
        `${relative} is missing a required watchOS ${variant || 'device'} architecture.`
      );
  }
}
function verifyRuntime() {
  const info = JSON.parse(read('build/xcframework/rnw-build.json'));
  if (
    info.reactNative !== versions['react-native'] ||
    info.hermes !== versions.hermes ||
    info.sourceHash !== sourceHash()
  )
    throw new Error(
      'The native runtime is stale. Run pnpm build:xcframework and pnpm build:expo-modules.'
    );
}
function verify() {
  verifyRuntime();
  checkSlices('build/xcframework/hermes.xcframework');
  checkSlices('build/xcframework/ReactNativeWatchOSCxx.xcframework');
  checkSlices('expo-modules/jsi/build/ExpoModulesJSI.xcframework');
  const manifest = JSON.parse(read('expo-modules/build-manifest.json'));
  if (JSON.stringify(manifest.versions) !== JSON.stringify(versions))
    throw new Error(
      'Expo build versions are stale. Run pnpm build:expo-modules.'
    );
  if (JSON.stringify(manifest.inputs) !== JSON.stringify(portInputs()))
    throw new Error(
      'Expo native port build inputs changed. Run pnpm build:expo-modules.'
    );
  const actual = Object.assign({}, ...artifactDirectories.map(inventory));
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files))
    throw new Error(
      'Expo/native artifact files changed or are incomplete. Run pnpm build:expo-modules.'
    );
  for (const file of [
    'ReactNativeWatchOSExpo.podspec',
    'expo-modules/autolinking.cjs',
    'expo-modules/core/RNWExpoModulesCore.podspec',
    'expo-modules/jsi/RNWExpoModulesJSI.podspec',
    'expo-modules/core/build/LICENSE',
    'expo-modules/jsi/LICENSE',
    'src/expoModules.ts',
  ])
    read(file);
  console.log(
    `Release package verified: ${Object.keys(actual).length} native artifact files; watchOS arm64/arm64_32 and simulator arm64.`
  );
}
try {
  const mode = process.argv[2];
  if (mode === '--record-runtime') {
    const packages = resolveNativeBuild(root);
    write('build/xcframework/rnw-build.json', {
      reactNative: packages['react-native'].version,
      hermes: versions.hermes,
      sourceHash: sourceHash(),
    });
  } else if (mode === '--record') {
    resolveNativeBuild(root);
    verifyRuntime();
    write('expo-modules/build-manifest.json', {
      versions,
      inputs: portInputs(),
      files: Object.assign({}, ...artifactDirectories.map(inventory)),
    });
    verify();
  } else if (!mode) verify();
  else throw new Error(`Unknown verification mode: ${mode}`);
} catch (error) {
  console.error(`[RNW release] ${error.message}`);
  process.exitCode = 1;
}
