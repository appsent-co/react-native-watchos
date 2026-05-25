// Globals required by the React scheduler + React's `act()` helper that
// standard React Native installs from `InitializeCore.js → setUpTimers.js`.
// The watch runtime doesn't run InitializeCore, so we install them here.
//
// Loaded as a side-effect import from `renderer/index.ts` and
// `dev-support` — both run before React itself initializes.

// Rich `console` shim — overrides the host's one-arg bootstrap with
// multi-arg formatting. Loaded first so the rest of polyfills.ts (and the
// rest of the bundle) gets the full behavior.
import './setupConsole';

// `globalThis.self` shim — must run before `whatwg-fetch` evaluates. Lives in
// its own module so Babel's ESM hoisting doesn't reorder it after the
// import. See setupSelfGlobal.ts for why.
import './setupSelfGlobal';

// WHATWG `fetch` + `Headers` + `Request` + `Response` polyfill. Reads
// `globalThis.XMLHttpRequest`, which RNWHermesHost installs via
// `rnwInstallXHR` before the bundle is evaluated.
import 'whatwg-fetch';

interface HermesInternalShape {
  enablePromiseRejectionTracker?: (opts: {
    allRejections: boolean;
    onUnhandled?: (id: number, error: unknown) => void;
    onHandled?: (id: number) => void;
  }) => void;
}

interface ErrorUtilsShape {
  setGlobalHandler: (fn: (error: unknown, isFatal: boolean) => void) => void;
  getGlobalHandler: () => (error: unknown, isFatal: boolean) => void;
  reportError: (error: unknown) => void;
  reportFatalError: (error: unknown) => void;
}

const g = globalThis as unknown as {
  setImmediate?: unknown;
  clearImmediate?: unknown;
  queueMicrotask?: (cb: () => void) => void;
  setTimeout?: (cb: (...args: unknown[]) => void, ms: number) => number;
  reportError?: (error: unknown) => void;
  console?: {
    error: (...args: unknown[]) => void;
  };
  HermesInternal?: HermesInternalShape;
  ErrorUtils?: ErrorUtilsShape;
};

// Schedule a continuation as fast as possible. The watch host's
// `RNWHermesHost.installTimers` registers `setTimeout` but NOT
// `queueMicrotask`, so we prefer queueMicrotask when present and
// fall back to `setTimeout(fn, 0)` otherwise. Without this fallback
// callbacks were silently dropped — the runtime didn't crash but no
// render work ever ran.
function scheduleSoon(fn: () => void): void {
  if (typeof g.queueMicrotask === 'function') {
    g.queueMicrotask(fn);
  } else if (typeof g.setTimeout === 'function') {
    g.setTimeout(fn, 0);
  } else {
    throw new Error(
      'No microtask scheduling primitive available (queueMicrotask / setTimeout). ' +
        'The watch host bootstrap should install at least one.'
    );
  }
}

if (typeof g.setImmediate !== 'function') {
  let nextId = 1;
  const cleared = new Set<number>();
  g.setImmediate = function setImmediate(
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ): number {
    if (typeof callback !== 'function') {
      throw new TypeError(
        'setImmediate must be called with a function as the first argument'
      );
    }
    const id = nextId++;
    scheduleSoon(() => {
      if (cleared.delete(id)) return;
      callback(...args);
    });
    return id;
  };
  g.clearImmediate = function clearImmediate(id: number): void {
    cleared.add(id);
  };
}

// ----------------------------------------------------------------------------
// Uncaught error reporting.
//
// On the watch, the native host catches C++ exceptions at the dispatch-block
// boundary (setTimeout/setInterval callbacks, fireEventWithHandlerId, the
// JS call invoker) but only NSLogs them — they never reach Metro and never
// trigger the on-device error toast.
//
// Standard React Native installs `globalThis.ErrorUtils` + a `reportError`
// + a Hermes promise-rejection tracker via `setUpErrorHandling.js`. We do
// the same here, routing every uncaught error to `console.error`, which the
// host already forwards to Metro AND publishes into the @Published `logs`
// array (so the SwiftUI overlay can show the toast).
// ----------------------------------------------------------------------------

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || String(error), stack: error.stack };
  }
  if (typeof error === 'object' && error != null) {
    const e = error as { message?: unknown; stack?: unknown };
    return {
      message:
        typeof e.message === 'string' ? e.message : JSON.stringify(error),
      stack: typeof e.stack === 'string' ? e.stack : undefined,
    };
  }
  return { message: String(error) };
}

function logError(prefix: string, error: unknown): void {
  const { message, stack } = formatError(error);
  // console.error → RNWHermesHost.onConsoleLog → ReactNativeWatchOSHost
  //                 publishes to `logs` + POSTs to /__watchos_log.
  g.console?.error?.(`${prefix} ${message}${stack ? '\n' + stack : ''}`);
}

// `reportError` — Web platform standard; React 19's effect / setState
// error path calls this when it can't propagate further. Hermes doesn't
// ship it natively, so polyfill.
if (typeof g.reportError !== 'function') {
  g.reportError = (error: unknown) => logError('[reportError]', error);
}

// `ErrorUtils` — RN's legacy global. Metro auto-bundles a polyfill (see
// `error-guard.js`) whose default handler simply rethrows the error,
// which on the watch means it explodes at the C++ dispatch boundary
// where the host only NSLogs. Override the handler to route to
// `console.error` instead, so the existing onConsoleLog → Metro pipeline
// catches it. If no ErrorUtils is present at all, install a minimal
// shim with the same routing.
if (g.ErrorUtils != null) {
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    logError(isFatal ? '[ErrorUtils fatal]' : '[ErrorUtils]', error);
  });
} else {
  let handler: (error: unknown, isFatal: boolean) => void = (
    error,
    isFatal
  ) => {
    logError(isFatal ? '[ErrorUtils fatal]' : '[ErrorUtils]', error);
  };
  g.ErrorUtils = {
    setGlobalHandler: (fn) => {
      handler = fn;
    },
    getGlobalHandler: () => handler,
    reportError: (error) => handler(error, false),
    reportFatalError: (error) => handler(error, true),
  };
}

// Hermes promise-rejection tracker — fires on `Promise.reject(...)`
// (or thrown inside async fn) that never gets a `.catch()` handler.
// The host's native catch sees the C++ exception too late (after the
// JS Promise machinery has already swallowed it), so the JS-side hook
// is the only reliable signal.
g.HermesInternal?.enablePromiseRejectionTracker?.({
  allRejections: true,
  onUnhandled: (id, error) => {
    logError(`[UnhandledPromiseRejection #${id}]`, error);
  },
});

// Wrap `setTimeout` so callbacks that throw don't tear the runtime
// down at the dispatch-block C++ exception boundary (where the host
// only NSLogs). React's scheduler runs via setTimeout (through our
// `setImmediate` polyfill above), so this catches most React effect /
// render errors and gets them to Metro.
//
// Reuses the captured `g.setTimeout` (Hermes' native host fn) — must
// happen AFTER any reassignment / wrapping by RN polyfills.
const nativeSetTimeout = g.setTimeout;
if (typeof nativeSetTimeout === 'function') {
  g.setTimeout = function setTimeout(
    callback: (...args: unknown[]) => void,
    ms: number,
    ...args: unknown[]
  ): number {
    if (typeof callback !== 'function') {
      return nativeSetTimeout(callback as never, ms);
    }
    return nativeSetTimeout(function wrapped(...inner: unknown[]) {
      try {
        callback(...(args.length > 0 ? args : inner));
      } catch (e) {
        logError('[setTimeout]', e);
      }
    }, ms);
  } as typeof nativeSetTimeout;
}

export {};
