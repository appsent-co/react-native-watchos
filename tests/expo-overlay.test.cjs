'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const coreRoot = path.join(repositoryRoot, 'expo-modules', 'core');
const generator = require(
  path.join(coreRoot, 'scripts', 'generate-overlay.cjs')
);
const exampleRequire = createRequire(
  path.join(repositoryRoot, 'example', 'package.json')
);
const upstreamCoreRoot = path.dirname(
  exampleRequire.resolve('expo-modules-core/package.json')
);

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-core-test-'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function coreSource(root) {
  return path.join(root, 'node_modules', 'expo-modules-core');
}

function tamperCoreSource(project, text) {
  fs.appendFileSync(
    path.join(coreSource(project), 'ios', 'ExpoModulesCore.swift'),
    `${text}\n`
  );
}

function createVersionMatchedProject(root) {
  const versions = generator.loadVersions();
  const modules = path.join(root, 'node_modules');
  for (const name of [
    'expo',
    'expo-modules-core',
    'expo-modules-jsi',
    'react-native',
    'react',
  ]) {
    writeJson(path.join(modules, name, 'package.json'), {
      name,
      version: versions[name],
    });
  }
  fs.cpSync(
    path.join(upstreamCoreRoot, 'ios'),
    path.join(coreSource(root), 'ios'),
    {
      recursive: true,
    }
  );
  fs.cpSync(
    path.join(upstreamCoreRoot, 'common', 'cpp'),
    path.join(coreSource(root), 'common', 'cpp'),
    { recursive: true }
  );
  fs.mkdirSync(path.join(modules, 'react-native', 'sdks'), { recursive: true });
  fs.writeFileSync(
    path.join(modules, 'react-native', 'sdks', '.hermesv1version'),
    `${versions.hermes}\n`
  );
  return versions;
}

test('source fingerprints reject a same-version Core package change', () => {
  const project = temporaryDirectory();
  try {
    const versions = createVersionMatchedProject(project);
    assert.doesNotThrow(() => generator.resolvePackages(project, versions));
    tamperCoreSource(project, '// same version, different source');
    assert.throws(
      () => generator.resolvePackages(project, versions),
      /source fingerprint mismatch/
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('failed validation leaves an existing overlay untouched', () => {
  const project = temporaryDirectory();
  const destination = path.join(project, 'overlay');
  try {
    const versions = createVersionMatchedProject(project);
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(
      path.join(destination, 'last-known-good'),
      'preserve me\n'
    );
    tamperCoreSource(project, '// source changed after version install');
    assert.throws(
      () =>
        generator.generateOverlay({
          projectRoot: project,
          destination,
          versions,
          check: false,
        }),
      /source fingerprint mismatch/
    );
    assert.equal(
      fs.readFileSync(path.join(destination, 'last-known-good'), 'utf8'),
      'preserve me\n'
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('checked transform markers reject absent and duplicate upstream shapes', () => {
  assert.throws(
    () => generator.assertExactlyOnce('no token', 'marker', 'test marker'),
    /exactly once; found 0/
  );
  assert.throws(
    () => generator.assertExactlyOnce('marker marker', 'marker', 'test marker'),
    /exactly once; found 2/
  );
});

test('generation is byte-for-byte deterministic and --check detects edits', () => {
  const temporaryRoot = temporaryDirectory();
  const first = path.join(temporaryRoot, 'first');
  const second = path.join(temporaryRoot, 'second');
  const versions = generator.loadVersions();
  try {
    generator.generateOverlay({
      projectRoot: path.join(repositoryRoot, 'example'),
      destination: first,
      versions,
      check: false,
    });
    generator.generateOverlay({
      projectRoot: path.join(repositoryRoot, 'example'),
      destination: second,
      versions,
      check: false,
    });
    generator.assertDirectoriesEqual(first, second);
    fs.appendFileSync(
      path.join(first, 'ios', 'ExpoModulesCore.swift'),
      '// edit\n'
    );
    assert.throws(
      () =>
        generator.generateOverlay({
          projectRoot: path.join(repositoryRoot, 'example'),
          destination: first,
          versions,
          check: true,
        }),
      /generated overlay file is stale/
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
