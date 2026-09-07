import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
test(
  'JS thread affinity, reentrancy, run-loop continuations and shutdown',
  {
    skip: process.platform !== 'darwin',
  },
  () => {
    const directory = mkdtempSync(join(tmpdir(), 'rnw-js-thread-'));
    try {
      const binary = join(directory, 'test');
      const sources = join(root, 'apple/Sources/ReactNativeWatchOSCxx');
      execFileSync('xcrun', [
        'clang++',
        '-std=c++20',
        '-fobjc-arc',
        '-Wall',
        '-Wextra',
        '-Werror',
        '-framework',
        'Foundation',
        `-I${sources}`,
        join(sources, 'RNWJSThread.mm'),
        join(root, 'tests/js-thread.test.mm'),
        '-o',
        binary,
      ]);
      execFileSync(binary, { timeout: 30000 });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
);
