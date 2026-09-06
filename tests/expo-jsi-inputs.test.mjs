import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  copiedDirectories,
  verifyUpstreamSources,
} from '../expo-modules/jsi/verify-upstream.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { resolveCompatibility } = require('../expo-modules/compatibility.cjs');
const upstream = resolveCompatibility(root)['expo-modules-jsi'].root;
const fingerprints = require('../expo-modules/jsi/upstream-files.json');
const pinnedSource = Object.keys(fingerprints).find((file) =>
  file.startsWith('apple/Sources/')
);

function fixture(t) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rnw-expo-jsi-inputs-')
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const file of Object.keys(fingerprints)) {
    const destination = path.join(directory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(upstream, file), destination);
  }
  return directory;
}

function reportsFileSetChange(directory, kind, file) {
  assert.throws(
    () => verifyUpstreamSources(directory, fingerprints),
    (error) => {
      assert.match(error.message, /source file set changed/);
      assert.ok(error.message.includes(`${kind}: ${file}`), error.message);
      return true;
    }
  );
}

test('the installed JSI package exactly matches all pinned build inputs', () => {
  verifyUpstreamSources(upstream, fingerprints);
});

test('unlisted files in every recursively copied directory are rejected', (t) => {
  const directory = fixture(t);
  for (const name of copiedDirectories) {
    const relative = `apple/${name}/nested/Unreviewed.swift`;
    const file = path.join(directory, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '// This file must never enter the native build.\n');
    reportsFileSetChange(directory, 'unexpected', relative);
    fs.unlinkSync(file);
  }
});

test('missing source, manifest, package metadata, and license are rejected', (t) => {
  const directory = fixture(t);
  for (const relative of [
    pinnedSource,
    'apple/Package.swift',
    'package.json',
    'LICENSE',
  ]) {
    const file = path.join(directory, relative);
    fs.unlinkSync(file);
    reportsFileSetChange(directory, 'missing', relative);
    fs.copyFileSync(path.join(upstream, relative), file);
  }
});

test('renaming a pinned file is rejected even when the file count is unchanged', (t) => {
  const directory = fixture(t);
  const replacement = 'apple/Sources/UnreviewedReplacement.swift';
  fs.renameSync(
    path.join(directory, pinnedSource),
    path.join(directory, replacement)
  );
  assert.throws(
    () => verifyUpstreamSources(directory, fingerprints),
    (error) => {
      assert.ok(error.message.includes(`missing: ${pinnedSource}`));
      assert.ok(error.message.includes(`unexpected: ${replacement}`));
      return true;
    }
  );
});

test('a modified pinned file still fails content fingerprint validation', (t) => {
  const directory = fixture(t);
  fs.appendFileSync(path.join(directory, pinnedSource), '// modified\n');
  assert.throws(
    () => verifyUpstreamSources(directory, fingerprints),
    /expo-modules-jsi source changed:/
  );
});

test('a symlink cannot stand in for a pinned source with identical contents', (t) => {
  const directory = fixture(t);
  const file = path.join(directory, pinnedSource);
  fs.unlinkSync(file);
  fs.symlinkSync(path.join(upstream, pinnedSource), file);
  assert.throws(
    () => verifyUpstreamSources(directory, fingerprints),
    /Symlinks and special files are not supported/
  );
});
