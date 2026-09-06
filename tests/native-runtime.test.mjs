import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = join(root, 'apple/Sources/ReactNativeWatchOSCxx');

test('native UTF-8 streaming and buffer range regressions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'rnw-native-tests-'));
  try {
    const binary = join(directory, 'native-runtime');
    execFileSync(process.env.CXX || 'c++', [
      '-std=c++17',
      '-Wall',
      '-Wextra',
      '-Werror',
      `-I${sources}`,
      join(root, 'tests/native-runtime.test.cpp'),
      process.platform === 'darwin' ? '-licucore' : '-licuuc',
      '-o',
      binary,
    ]);
    execFileSync(binary);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('build-time embedding preserves the authored runtime scripts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'rnw-embed-tests-'));
  try {
    for (const name of ['WebSocket', 'TextDecoder']) {
      const input = join(sources, 'runtime', `${name}.js`);
      const output = join(directory, `${name}.h`);
      execFileSync('cmake', [
        `-DINPUT=${input}`,
        `-DOUTPUT=${output}`,
        `-DSYMBOL=kRNW${name}Script`,
        '-P',
        join(root, 'cmake/host/embed-javascript.cmake'),
      ]);
      const generated = readFileSync(output, 'utf8');
      const source = readFileSync(input, 'utf8');
      assert.ok(generated.includes(`R"RNWJS(${source})RNWJS";`));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
