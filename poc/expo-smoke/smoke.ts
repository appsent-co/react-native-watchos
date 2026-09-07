import '../../src/polyfills';
import {
  NativeModule,
  SharedObject,
  requireNativeModule,
  requireOptionalNativeModule,
} from 'expo-modules-core';

const runtime = globalThis as typeof globalThis & {
  __RNW_EXPO_SMOKE_COMPANION?: boolean;
  __RNW_EXPO_COMPANION_VERIFY?: () => Promise<void>;
};
const module = requireNativeModule('RNWExpoModulesProof');
const pause = () => new Promise((resolve) => setTimeout(resolve, 10));

function fail(error: unknown) {
  console.error(
    `EXPO_SMOKE_FAIL:${error instanceof Error ? error.stack : String(error)}`
  );
}

async function pendingWork() {
  let subscription: { remove(): void };
  const started = new Promise<void>((resolve) => {
    subscription = module.addListener('slowStarted', resolve);
  });
  module.slowDouble(1).then(() => console.log('EXPO_SMOKE_LATE_CALLBACK'));
  await started;
  subscription!.remove();
}

async function run() {
  const checks: string[] = [];
  function check(condition: unknown, label: string) {
    if (!condition) throw new Error(label);
    checks.push(label);
  }

  if (runtime.__RNW_EXPO_SMOKE_COMPANION) {
    check(module.getState() === 0, 'companion starts with fresh native state');
    check(module.runtimeIsolation(), 'companion runtime queue isolation');
    module.setState(777);
    const shared = new module.SharedCounter(999);
    const events: number[] = [];
    const subscription = module.addListener(
      'changed',
      (event: { value: number }) => events.push(event.value)
    );
    await module.delayedDouble(50);
    await pause();
    check(events.length === 1 && events[0] === 100, 'companion initial event');
    runtime.__RNW_EXPO_COMPANION_VERIFY = async () => {
      try {
        check(
          module.getState() === 777,
          'native state survives other host reloads'
        );
        check(
          module.readShared(shared) === 999,
          'SharedObject stays in its runtime'
        );
        check(events.length === 1, 'events stay in their runtime');
        check(
          (await module.delayedDouble(51)) === 102,
          'companion scheduler remains live'
        );
        await pause();
        check(
          events.length === 2 && events[1] === 102,
          'companion event after reloads'
        );
        subscription.remove();
        shared.release();
        await pendingWork();
        check(true, 'companion native work pending at teardown');
        console.log(`EXPO_SMOKE_COMPANION_PASS:${checks.join(', ')}`);
      } catch (error) {
        fail(error);
      }
    };
    console.log('EXPO_SMOKE_COMPANION_READY');
    return;
  }

  check(typeof NativeModule === 'function', 'Expo JSI installer');
  check(
    requireOptionalNativeModule('RNWExpoModulesProof') === module &&
      requireOptionalNativeModule('MissingSmokeModule') === null,
    'public module lookup'
  );
  check(module instanceof NativeModule, 'real NativeModule');
  check(module.double(21) === 42, 'sync Function');
  check(module.runtimeIsolation(), 'runtime queue isolation');
  let argumentError = false;
  try {
    module.double();
  } catch {
    argumentError = true;
  }
  check(argumentError, 'native argument validation');

  const record = module.transformRecord({ count: 8, label: 'record' });
  check(record.count === 9 && record.label === 'record!', 'Record conversion');
  check(module.enumValue('large') === 'large', 'Enumerable conversion');
  let enumError = false;
  try {
    module.enumValue('invalid');
  } catch {
    enumError = true;
  }
  check(enumError, 'invalid Enumerable rejection');

  const shared = new module.SharedCounter(5);
  check(
    shared instanceof SharedObject &&
      shared.value === 5 &&
      shared.increment(3) === 8,
    'SharedObject identity and method'
  );
  check(module.readShared(shared) === 8, 'SharedObject argument conversion');
  shared.release();
  let releasedError = false;
  try {
    module.readShared(shared);
  } catch {
    releasedError = true;
  }
  check(releasedError, 'SharedObject release');
  check(module.getState() === 0, 'fresh native state on reload');
  module.setState(42);

  const events: number[] = [];
  const subscription = module.addListener(
    'changed',
    (event: { value: number }) => events.push(event.value)
  );
  check((await module.awaitDouble(7)) === 14, 'Swift async continuation');
  check((await module.delayedDouble(6)) === 12, 'async Promise resolution');
  await pause();
  check(events.length === 1 && events[0] === 12, 'native event payload');
  subscription.remove();
  await module.delayedDouble(9);
  await pause();
  check(events.length === 1, 'event listener removal');

  let rejected = false;
  try {
    await module.reject();
  } catch (error) {
    rejected =
      (error as { code?: string }).code === 'ERR_RNW_PROOF' &&
      String(error).includes('expected rejection');
  }
  check(rejected, 'async Promise rejection');
  await pendingWork();
  check(true, 'native work pending at teardown');
  console.log(`EXPO_SMOKE_PASS:${checks.join(', ')}`);
}
run().catch(fail);
