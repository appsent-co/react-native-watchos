// Loaded directly into the real RNW Hermes runtime. Native APIs come from
// Expo's original installer and Module DSL, with no React or UI bundle.
(async () => {
  const checks = [];
  function check(condition, label) {
    if (!condition) throw new Error(label);
    checks.push(label);
  }
  check(typeof globalThis.expo === 'object', 'Expo JSI installer');
  const module = globalThis.expo.modules.RNWExpoModulesProof;
  check(module instanceof globalThis.expo.NativeModule, 'real NativeModule');
  check(module.double(21) === 42, 'sync Function');
  let argumentError = false;
  try {
    module.double();
  } catch {
    argumentError = true;
  }
  check(argumentError, 'native argument validation');

  const events = [];
  const subscription = module.addListener('changed', (event) =>
    events.push(event.value)
  );
  check((await module.delayedDouble(6)) === 12, 'async Promise resolution');
  // sendEvent and promise resolution both travel through the RNW JS queue.
  await new Promise((resolve) => setTimeout(resolve, 10));
  check(events.length === 1 && events[0] === 12, 'native event payload');
  subscription.remove();
  await module.delayedDouble(9);
  await new Promise((resolve) => setTimeout(resolve, 10));
  check(events.length === 1, 'event listener removal');

  let rejected = false;
  try {
    await module.reject();
  } catch (error) {
    rejected =
      error.code === 'ERR_RNW_PROOF' &&
      String(error).includes('expected rejection');
    if (!rejected) {
      throw new Error(
        `Unexpected rejection: ${String(error)}; ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      );
    }
  }
  check(rejected, 'async Promise rejection');
  // Native execution outlives the runtime. Its Promise must be dropped safely.
  let startedSubscription;
  const started = new Promise((resolve) => {
    startedSubscription = module.addListener('slowStarted', resolve);
  });
  module.slowDouble(1).then(() => console.log('EXPO_SMOKE_LATE_CALLBACK'));
  await started;
  startedSubscription.remove();
  check(true, 'native work pending at teardown');
  console.log(`EXPO_SMOKE_PASS:${checks.join(', ')}`);
})().catch((error) => console.error(`EXPO_SMOKE_FAIL:${error.stack || error}`));
