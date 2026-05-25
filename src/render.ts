import type { ReactNode } from 'react';
import ReconcilerFactory from 'react-reconciler';

import { createHostConfig } from './createHostConfig';
import { installEventBridge } from './eventRegistry';

// Install `globalThis.__RNW_EVENTS.dispatch` at module-import time so
// the native side can find it as soon as the first commit hits — well
// before any React effect fires.
installEventBridge();

// Inert sentinel — the C++ side owns the root child list directly, so the
// container is never addressed by tag. We just need a stable object identity
// so the reconciler can key its container state off it.
const container: object = {};

// `ReconcilerFactory`'s parameter type changes per minor version (see the
// comment in createHostConfig.ts). The cast keeps the call site stable.
const Reconciler = (
  ReconcilerFactory as unknown as (config: unknown) => unknown
)(createHostConfig()) as {
  createContainer: (...args: unknown[]) => unknown;
  updateContainer: (
    element: ReactNode,
    container: unknown,
    parentComponent: unknown,
    callback: unknown
  ) => void;
  injectIntoDevTools: () => boolean;
};

// React 19's react-reconciler dropped the auto-registration with the
// DevTools global hook that older versions did at module-import time.
// Consumers must now invoke `injectIntoDevTools()` to publish the
// `scheduleRefresh` / `scheduleRoot` helpers React Refresh reads through
// `__REACT_DEVTOOLS_GLOBAL_HOOK__`. Without this, Fast Refresh updates
// arrive, modules re-evaluate, and `performReactRefresh()` runs — but
// React has no registered renderer to forward the swap to, so the
// fiber tree never re-renders.
Reconciler.injectIntoDevTools();

// Forward React's error callbacks to `console.error`. The watch host
// routes console.error → onConsoleLog → reportToMetro (Metro terminal)
// AND bumps `ReactNativeWatchOSHost.lastErrorAt` → triggers the
// `RNWErrorToast` overlay. Without these hooks, React swallows every
// render-phase throw silently (no toast, no log, no crash).
function reportRenderError(label: string, error: unknown): void {
  const e = error as { message?: unknown; stack?: unknown };
  const message = typeof e?.message === 'string' ? e.message : String(error);
  const stack = typeof e?.stack === 'string' ? `\n${e.stack}` : '';
  const g = globalThis as unknown as {
    console?: { error: (...args: unknown[]) => void };
  };
  g.console?.error?.(`[React ${label}] ${message}${stack}`);
}

// `createContainer` signature drifts across react-reconciler versions
// (added: hydrationCallbacks, isStrictMode, concurrentUpdatesByDefault,
//  identifierPrefix, onRecoverableError, transitionCallbacks…). All
// trailing optional args — passing them positionally is forward-compatible.
const root = Reconciler.createContainer(
  container,
  /* tag (LegacyRoot=0, ConcurrentRoot=1) */ 1,
  /* hydrationCallbacks */ null,
  /* isStrictMode */ false,
  /* concurrentUpdatesByDefault */ null,
  /* identifierPrefix */ '',
  /* onUncaughtError */ (error: unknown) =>
    reportRenderError('uncaught', error),
  /* onCaughtError */ (error: unknown) => reportRenderError('caught', error),
  /* onRecoverableError */ (error: unknown) =>
    reportRenderError('recoverable', error),
  /* transitionCallbacks */ null
);

export function render(element: ReactNode): void {
  Reconciler.updateContainer(element, root, null, null);
}
