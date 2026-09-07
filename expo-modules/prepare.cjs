#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const versions = require('./versions.json');

// Maintainer build only. Apply normal unified diffs in disposable directories;
// neither the repository nor the app's node_modules contains rewritten sources.
function prepare(name, destination, directories, extraFiles = []) {
  const coreRequire = createRequire(
    require.resolve('expo-modules-core/package.json')
  );
  const manifest = coreRequire.resolve(`${name}/package.json`);
  const source = path.dirname(manifest);
  if (JSON.parse(fs.readFileSync(manifest)).version !== versions[name])
    throw new Error(`Build requires ${name}@${versions[name]}.`);
  fs.mkdirSync(destination, { recursive: true });
  for (const part of [...directories, ...extraFiles]) {
    const target = path.join(destination, part);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(path.join(source, part), target, { recursive: true });
  }
  const patch = path.join(
    __dirname,
    'patches',
    `${name}+${versions[name]}.patch`
  );
  execFileSync('git', ['apply', '--check', patch], { cwd: destination });
  execFileSync('git', ['apply', patch], { cwd: destination });
  return destination;
}

function prepareAll() {
  const root = path.resolve(__dirname, '..');
  prepare(
    'expo-modules-core',
    path.join(__dirname, 'core/build'),
    ['ios', 'common'],
    ['LICENSE']
  );
  const jsi = prepare(
    'expo-modules-jsi',
    path.join(root, 'build/expo-modules-jsi'),
    [
      'apple/Sources',
      'apple/APINotes',
      'apple/Tests',
      'apple/Benchmarks',
      'apple/scripts',
    ],
    ['apple/Package.swift', 'package.json', 'LICENSE']
  );
  const headers = path.join(
    root,
    'build/xcframework/ReactNativeWatchOSCxx.xcframework/watchos-arm64_arm64_32/Headers'
  );
  const link = path.join(jsi, 'headers-pods/Headers/Public/React-jsi');
  fs.mkdirSync(path.dirname(link), { recursive: true });
  const entry = fs.lstatSync(link, { throwIfNoEntry: false });
  if (entry?.isSymbolicLink()) fs.unlinkSync(link);
  else if (entry) throw new Error(`Expected generated symlink: ${link}`);
  fs.symlinkSync(headers, link, 'dir');
}
if (require.main === module) prepareAll();
module.exports = { prepare, prepareAll };
