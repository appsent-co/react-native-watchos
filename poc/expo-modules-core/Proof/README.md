# Proof module contract

`RNWExpoModulesProof` must be compiled into the watch app after the two overlay
pods are linked. It supplies four checks without depending on React Native UI
APIs:

1. `global.expo.modules.RNWExpoModulesProof.double(21)` returns `42`.
2. `await delayedDouble(21)` returns `42`. Its body runs on Expo's actual
   `AsyncFunction` queue and must resolve through the host scheduler callback.
3. A JS `EventEmitter` listener receives `{ value: 42 }` from `changed`.
4. After a host/runtime teardown and a new runtime creation, the native
   lifecycle snapshot reports one destroy for the old module and one create for
   the new module. Schedule an async call before teardown and assert a late
   callback is dropped by the invalidated RNW JS queue rather than touching the
   freed Hermes runtime.

The proof must use the watch-only JavaScript entry that reads
`globalThis.expo.modules`; the stock `expo-modules-core` entry imports React
Native UI/bridge helpers before it can observe the installed global.
