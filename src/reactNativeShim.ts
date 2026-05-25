// Stand-in for the `react-native` package on the watchos platform.
//
// `withWatchosMetro` aliases `react-native` → this file when the bundle's
// platform is `watchos`. Without that redirect, Metro statically walks
// `react-native/index.js` (every `require()` inside the lazy getters is
// part of the dep graph) and ends up resolving `setUpReactDevTools.js` →
// `ReactDevToolsSettingsManager`, a file RN only ships as `.android.js` /
// `.ios.js`. No `.watchos.js` variant means the resolver fails to bundle.
//
// The watch runtime has no batched bridge, no UIManager, no DevTools — it
// only has Hermes + `globalThis.__turboModuleProxy` installed by
// `RNWHermesHost.installTurboModules`. So this shim deliberately exposes
// only `TurboModuleRegistry` (and the `TurboModule` brand interface).
// Other RN APIs would crash at runtime here.

export interface TurboModule {}

type TurboModuleProxy = <T extends TurboModule>(name: string) => T | null;

function requireModule<T extends TurboModule>(name: string): T | null {
  const proxy = (globalThis as { __turboModuleProxy?: TurboModuleProxy })
    .__turboModuleProxy;
  return proxy ? proxy<T>(name) : null;
}

export const TurboModuleRegistry = {
  get<T extends TurboModule>(name: string): T | null {
    return requireModule<T>(name);
  },
  getEnforcing<T extends TurboModule>(name: string): T {
    const mod = requireModule<T>(name);
    if (mod == null) {
      throw new Error(
        `TurboModuleRegistry.getEnforcing(...): '${name}' could not be found. ` +
          `Verify that a module by this name is registered in the native binary.`
      );
    }
    return mod;
  },
};

/** Marker the JS facade for watch-only modules (e.g. WatchConnectivity)
 *  uses to detect which platform's event-delivery path to install.
 *  Standard `react-native` doesn't define this; the shim does. */
export const IS_WATCHOS = true;

/** Stub for `Platform` so consumer code that does
 *  `import { Platform } from 'react-native'` on watchOS doesn't crash
 *  at the import site. Anything reading `Platform.OS` gets `'watchos'`. */
export const Platform = {
  OS: 'watchos' as const,
  select: <T>(specifics: { default?: T; watchos?: T }): T | undefined =>
    specifics.watchos ?? specifics.default,
};

/**
 * Functional `NativeEventEmitter` stub. Mirrors the iOS RN API so the
 * same JS facade works on both platforms unchanged:
 *
 *   const emitter = new NativeEventEmitter(NativeMyModule);
 *   const sub = emitter.addListener('foo', payload => { ... });
 *   sub.remove();
 *
 * Under the hood on watchOS:
 *   - `addListener(name, fn)` registers `fn` in the shared name-keyed
 *     listener registry (`eventRegistry`).
 *   - `sendEventWithName:body:` on the native side posts a notification
 *     carrying the event name; the Swift host forwards into
 *     `__RNW_EVENTS.dispatchEvent(name, payload)`, which fans out to
 *     every registered listener for that name.
 *   - No native handshake — the native module never learns about
 *     individual listeners. `addListener` / `removeListeners` on the
 *     native side are called for parity with RN's contract but are
 *     no-ops in the watch stub.
 */
type ShimListener = (payload?: unknown) => void;

interface ShimNativeModule {
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
}

export class NativeEventEmitter {
  private readonly _nativeModule: ShimNativeModule;

  constructor(nativeModule: ShimNativeModule) {
    this._nativeModule = nativeModule;
  }

  addListener(
    eventName: string,
    listener: ShimListener
  ): { remove: () => void } {
    // Lazy-require to break the circular dep: eventRegistry imports
    // the JS runtime globals installed by RNWHermesHost, and pulling
    // it eagerly would crash if the shim is loaded before the host.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerEventListener, installEventBridge } =
      require('./eventRegistry') as typeof import('./eventRegistry');
    // Make sure `__RNW_EVENTS.dispatchEvent` is installed even when the
    // consumer imports this shim without also importing the renderer.
    installEventBridge();

    const dispose = registerEventListener(eventName, listener);
    this._nativeModule.addListener?.(eventName);
    return {
      remove: () => {
        dispose();
        this._nativeModule.removeListeners?.(1);
      },
    };
  }
}
