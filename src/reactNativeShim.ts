// Stand-in for the `react-native` package on watchos. Aliased by
// `withWatchosMetro` so Metro doesn't walk RN's `.ios.js`-only DevTools
// graph. Wires `__turboModuleProxy` + `__rnwInvokeNativeModuleMethod`
// (both installed by `RNWHermesHost`) into the standard
// `TurboModuleRegistry` / `NativeModules` surface.

export interface TurboModule {}

type TurboModuleProxy = <T extends TurboModule>(name: string) => T | null;
type InvokeFn = (
  moduleName: string,
  methodName: string,
  ...args: unknown[]
) => unknown;
type ConstantsFn = (moduleName: string) => Record<string, unknown> | null;

interface RNWGlobals {
  __turboModuleProxy?: TurboModuleProxy;
  __rnwInvokeNativeModuleMethod?: InvokeFn;
  __rnwGetNativeModuleConstants?: ConstantsFn;
}

const moduleProxyCache = new Map<string, object>();

function buildInteropModule<T>(name: string): T {
  const getConstants = (globalThis as RNWGlobals)
    .__rnwGetNativeModuleConstants;
  const invoke = (globalThis as RNWGlobals).__rnwInvokeNativeModuleMethod;
  if (invoke == null) {
    throw new Error(
      `NativeModules.${name}: native bridge not installed yet. ` +
        `RNWHermesHost must finish initializing before module access.`
    );
  }
  const constants = getConstants ? getConstants(name) : null;
  const base: Record<string, unknown> = { ...(constants ?? {}) };
  // Legacy modules call `.getConstants()` as a method (op-sqlite, etc.).
  // Serve it from the already-fetched constants rather than dispatching to
  // native, where it isn't an RCT_EXPORT_METHOD and would 404.
  base.getConstants = () => constants ?? {};
  const proxy = new Proxy(base, {
    get(target, prop) {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop);
      }
      if (prop in target) {
        return target[prop];
      }
      // JS protocol slots — never dispatch these to native.
      if (prop === 'then' || prop === 'toString' || prop === 'valueOf') {
        return undefined;
      }
      const fn = (...args: unknown[]) => invoke(name, prop, ...args);
      // Cache so libraries that `===` their method references keep working.
      target[prop] = fn;
      return fn;
    },
  });
  return proxy as T;
}

function getInteropModule<T>(name: string): T {
  const cached = moduleProxyCache.get(name);
  if (cached !== undefined) {
    return cached as T;
  }
  const built = buildInteropModule<T>(name);
  moduleProxyCache.set(name, built as object);
  return built;
}

function requireModule<T extends TurboModule>(name: string): T | null {
  // Codegen-spec path first; falls back to legacy `RCT_EXPORT_MODULE` interop.
  const proxy = (globalThis as RNWGlobals).__turboModuleProxy;
  const fromTM = proxy ? proxy<T>(name) : null;
  if (fromTM != null) {
    return fromTM;
  }
  const invoke = (globalThis as RNWGlobals).__rnwInvokeNativeModuleMethod;
  if (invoke == null) {
    return null;
  }
  return getInteropModule<T>(name);
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

/** Legacy `NativeModules` API for libraries that still do
 *  `NativeModules.X.someMethod()` (op-sqlite, mmkv-pre-3.x, etc.). */
export const NativeModules: Record<string, unknown> = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return getInteropModule(prop);
    },
  }
);

/** Marker for watch-only JS facades (e.g. WatchConnectivity) to detect
 *  the platform without a `Platform.OS` comparison. */
export const IS_WATCHOS = true;

export const Platform = {
  OS: 'watchos' as const,
  select: <T>(specifics: { default?: T; watchos?: T }): T | undefined =>
    specifics.watchos ?? specifics.default,
};

/** `NativeEventEmitter` stub. Listeners go into the shared
 *  `eventRegistry`; native posts notifications that the Swift host
 *  forwards into `__RNW_EVENTS.dispatchEvent(name, payload)`. */
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
    // Lazy-require: eventRegistry reads globals installed by RNWHermesHost,
    // so eager import crashes when the shim loads before the host.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerEventListener, installEventBridge } =
      require('./eventRegistry') as typeof import('./eventRegistry');
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
