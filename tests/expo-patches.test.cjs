const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { prepare } = require('../expo-modules/prepare.cjs');
const coreManifest = require.resolve('expo-modules-core/package.json');
const coreRoot = path.dirname(coreManifest);
const jsiRoot = path.dirname(
  createRequire(coreManifest).resolve('expo-modules-jsi/package.json')
);

function temporary(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-expo-patch-'));
  try {
    fn(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('Core patch applies reproducibly without changing the installed Expo package', () =>
  temporary((directory) => {
    const upstream = fs.readFileSync(
      path.join(coreRoot, 'ios/Core/AppContext.swift')
    );
    const parts = ['ios', 'common'];
    prepare('expo-modules-core', directory, parts, ['LICENSE']);
    const first = fs.readFileSync(
      path.join(directory, 'ios/Core/AppContext.swift')
    );
    assert.notDeepEqual(first, upstream);
    assert.deepEqual(
      fs.readFileSync(path.join(coreRoot, 'ios/Core/AppContext.swift')),
      upstream
    );
    prepare('expo-modules-core', directory, parts, ['LICENSE']);
    assert.deepEqual(
      fs.readFileSync(path.join(directory, 'ios/Core/AppContext.swift')),
      first
    );
    // This is a normal reversible patch, retaining upstream iOS implementations.
    execFileSync(
      'git',
      [
        'apply',
        '--reverse',
        '--check',
        path.resolve(
          __dirname,
          '../expo-modules/patches/expo-modules-core+57.0.16.patch'
        ),
      ],
      { cwd: directory }
    );
  }));

test('watch JSI build uses every upstream runtime source byte-for-byte', () =>
  temporary((directory) => {
    prepare(
      'expo-modules-jsi',
      directory,
      ['apple/Sources', 'apple/scripts'],
      ['apple/Package.swift']
    );
    function compare(relative) {
      for (const entry of fs.readdirSync(path.join(jsiRoot, relative), {
        withFileTypes: true,
      })) {
        const file = path.join(relative, entry.name);
        if (entry.isDirectory()) compare(file);
        else
          assert.deepEqual(
            fs.readFileSync(path.join(directory, file)),
            fs.readFileSync(path.join(jsiRoot, file)),
            file
          );
      }
    }
    compare('apple/Sources');
  }));
