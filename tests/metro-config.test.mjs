import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const exampleRoot = new URL('../example/', import.meta.url).pathname;
const { withWatchosMetro } = require('../metro-config');

test('registers watchos as a resolver platform', () => {
  const config = withWatchosMetro({ projectRoot: exampleRoot });
  assert.ok(config.resolver.platforms.includes('watchos'));
  assert.deepEqual(config.resolver.unstable_conditionsByPlatform.watchos, [
    'react-native',
  ]);
  withWatchosMetro(config);
  assert.equal(
    config.resolver.platforms.filter((p) => p === 'watchos').length,
    1
  );
});

test('teaches Expo autolinking that watchos has no RN host package', () => {
  withWatchosMetro({ projectRoot: exampleRoot });
  const { getSupportPackageForPlatform } = require(
    require.resolve('expo/internal/unstable-autolinking-exports', {
      paths: [exampleRoot],
    })
  );
  assert.equal(getSupportPackageForPlatform('watchos'), null);
  assert.equal(getSupportPackageForPlatform('ios'), 'react-native');
  assert.equal(getSupportPackageForPlatform('tvos'), 'react-native-tvos');
  assert.throws(() => getSupportPackageForPlatform('unknown-platform'));
});
