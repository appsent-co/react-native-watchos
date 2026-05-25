/// JS-side bridge endpoint for native → JS events.
///
/// Two parallel registries live behind `globalThis.__RNW_EVENTS`:
///
///   - `dispatch(id, payload)` — id-keyed table, used by SwiftUI action
///     closures (`onPress`, `onChange`, …). The renderer registers a
///     callback via `registerHandler` and embeds the returned numeric id
///     in the shadow node prop. Numbers cross the FFI cleanly; closures
///     don't.
///
///   - `dispatchEvent(name, payload)` — name-keyed fan-out, used by
///     `RCTEventEmitter sendEventWithName:body:` on the native side and
///     the `NativeEventEmitter` shim on the JS side. Multiple listeners
///     per name are supported; the fan-out iterates the set.
///
/// The bridge install is idempotent — `installEventBridge` is safe to
/// call multiple times (the render module does it on import).

type Handler = (payload?: unknown) => void;

const handlers = new Map<number, Handler>();
let nextId = 1;

/// Register a JS callback and get a stable numeric id back. The returned
/// id is what gets sent across the bridge as the `onPress` / `onChange`
/// prop value. Call `unregisterHandler` on unmount to free the slot.
export function registerHandler(fn: Handler): number {
  const id = nextId++;
  handlers.set(id, fn);
  return id;
}

export function unregisterHandler(id: number): void {
  handlers.delete(id);
}

const eventListeners = new Map<string, Set<Handler>>();

/// Register a listener for events fired by name (via the native
/// `RCTEventEmitter`). Returns a disposer; many listeners can share one
/// name and all of them fire on dispatch.
export function registerEventListener(name: string, fn: Handler): () => void {
  let set = eventListeners.get(name);
  if (set == null) {
    set = new Set();
    eventListeners.set(name, set);
  }
  set.add(fn);
  return () => {
    const current = eventListeners.get(name);
    if (current == null) return;
    current.delete(fn);
    if (current.size === 0) eventListeners.delete(name);
  };
}

// `console` lives on globalThis (installed by RNWHermesHost) but isn't in
// the TS lib's ESNext target. Reach for it via globalThis for the type.
const g = globalThis as unknown as {
  console?: { error: (...args: unknown[]) => void };
};

/// Invoked by the native side via `globalThis.__RNW_EVENTS.dispatch`.
/// Stale ids (handlers freed between event scheduling and firing) are
/// silently dropped — the native side doesn't know about React's
/// unmount lifecycle.
function dispatch(id: number, payload?: unknown): void {
  const fn = handlers.get(id);
  if (fn === undefined) return;
  try {
    fn(payload);
  } catch (e) {
    // Don't let a user handler error tear down the runtime. The thrown
    // value surfaces to Metro via console.error (RNWHermesHost forwards
    // every console.* through onConsoleLog → reportToMetro).
    g.console?.error('event handler threw:', e);
  }
}

/// Invoked by the native side via `globalThis.__RNW_EVENTS.dispatchEvent`.
/// Events fired before any listener is registered are silently dropped
/// (matches the iOS behavior of events firing before `addListener`).
function dispatchEvent(name: string, payload?: unknown): void {
  const set = eventListeners.get(name);
  if (set === undefined) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch (e) {
      g.console?.error('event listener threw:', e);
    }
  }
}

let installed = false;

/// Install `globalThis.__RNW_EVENTS = { dispatch, dispatchEvent }` so the
/// native side can find the dispatchers. Called once, on render-module
/// import (and again, idempotently, from the `NativeEventEmitter` shim).
export function installEventBridge(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as {
    __RNW_EVENTS?: {
      dispatch: typeof dispatch;
      dispatchEvent: typeof dispatchEvent;
    };
  };
  g.__RNW_EVENTS = { dispatch, dispatchEvent };
}
