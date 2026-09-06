import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// Shared with preparation so its recursive copies cannot outgrow validation.
export const copiedDirectories = Object.freeze([
  'Sources',
  'APINotes',
  'Tests',
  'Benchmarks',
  'scripts',
]);
const inputRoots = [
  ...copiedDirectories.map((directory) => `apple/${directory}`),
  'apple/Package.swift',
  'package.json',
  'LICENSE',
];

/** Validate the complete input tree without creating or changing any files. */
export function verifyUpstreamSources(upstream, fingerprints) {
  const actual = new Set();
  function visit(relative) {
    const file = path.join(upstream, relative);
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) {
        visit(path.posix.join(relative, name));
      }
    } else if (stat.isFile()) {
      actual.add(relative);
    } else {
      throw new Error(
        `[RNW Expo modules] expo-modules-jsi input must be a regular file or directory: ${relative}. Symlinks and special files are not supported.`
      );
    }
  }
  for (const relative of inputRoots) visit(relative);

  const expected = new Set(Object.keys(fingerprints));
  const missing = [...expected].filter((file) => !actual.has(file)).sort();
  const unexpected = [...actual].filter((file) => !expected.has(file)).sort();
  if (missing.length || unexpected.length) {
    const details = [
      missing.length ? `missing: ${missing.join(', ')}` : '',
      unexpected.length ? `unexpected: ${unexpected.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(
      `[RNW Expo modules] expo-modules-jsi source file set changed (${details.join('; ')}). Review the source port before building.`
    );
  }

  for (const [file, expectedHash] of Object.entries(fingerprints)) {
    const source = fs.readFileSync(path.join(upstream, file));
    if (
      crypto.createHash('sha256').update(source).digest('hex') !== expectedHash
    ) {
      throw new Error(
        `[RNW Expo modules] expo-modules-jsi source changed: ${file}. Review the source port before building.`
      );
    }
  }
}
