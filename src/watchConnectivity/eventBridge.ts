// Cross-platform event subscription for the WatchConnectivity TurboModule.
//
// Uses `NativeEventEmitter` from `react-native` unconditionally. On iOS
// that's RN's real implementation (bridge → RCTDeviceEventEmitter); on
// watchOS, Metro aliases `react-native` → `reactNativeShim`, which
// provides a name-keyed stub that routes dispatches through
// `__RNW_EVENTS.dispatchEvent`. The maintainer-facing API is identical
// on both platforms.

import type { Subscription } from './types';

type Listener = (payload: unknown) => void;

interface NativeModule {
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
}

export function createEventBridge(nativeModule: NativeModule) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  const NativeEventEmitter = RN.NativeEventEmitter as new (mod: unknown) => {
    addListener(name: string, fn: Listener): { remove(): void };
  };
  const emitter = new NativeEventEmitter(nativeModule);

  return {
    subscribe(eventName: string, listener: Listener): Subscription {
      return emitter.addListener(eventName, listener);
    },
  };
}
