// Side-effect module: install React Refresh + connect to Metro's HMR
// endpoint. Import this BEFORE any module that pulls in React, otherwise
// `injectIntoGlobalHook` lands after React has already cached the runtime
// and Refresh registrations are silently ignored.
//
//   // example/index.watchos.tsx
//   import '@appsent-co/react-native-watchos/dev-support';
//   import { render } from '@appsent-co/react-native-watchos/renderer';
//   …
//
// The Swift host injects `globalThis.__RNW_DEV_SERVER` with the dev-server
// host/port/entry parsed from the bundle URL. If that global isn't present
// (production build, static bundle, etc.), this module is a no-op.

// Side-effect import — installs `setImmediate`/`clearImmediate` globals
// before any consumer code (including React's scheduler) reads them.
// Idempotent; safe to run again from the renderer's own import chain.
import '../polyfills';

// Bare-minimum runtime shape we depend on. The real interface in
// `react-refresh/runtime` is larger; we just name the bits we touch.
interface RefreshRuntime {
  injectIntoGlobalHook(global: unknown): void;
  register(type: unknown, id: string): void;
  createSignatureFunctionForTransform(): (
    type: unknown,
    key: string,
    forceReset?: boolean,
    getCustomHooks?: () => unknown[]
  ) => unknown;
  isLikelyComponentType(type: unknown): boolean;
  getFamilyByType(type: unknown): unknown;
  performReactRefresh(): void;
}

interface DevServerInfo {
  host: string;
  port: number;
  entry: string;
  scheme: 'http' | 'https';
}

// Metro's polyfill reads `global.__ReactRefresh` once per module load.
// We populate it before any other module evaluates (this file is the
// first thing the entry imports), so by the time React itself loads it
// already sees the hook.
interface ReactRefreshGlobal {
  register: RefreshRuntime['register'];
  createSignatureFunctionForTransform: RefreshRuntime['createSignatureFunctionForTransform'];
  isLikelyComponentType: RefreshRuntime['isLikelyComponentType'];
  getFamilyByType: RefreshRuntime['getFamilyByType'];
  performReactRefresh(): void;
  performFullRefresh(reason: string): void;
}

// `__DEV__` is a Metro-defined global, true only for dev bundles. Guarding
// the whole side effect on it lets Metro dead-code-eliminate this entire
// module from production bundles.
declare const __DEV__: boolean;

// `require`, `console`, and `setTimeout` aren't in tsconfig's `lib`
// (ESNext only — no DOM, no Node). Bridge them through globalThis the
// same way `createHostConfig.ts` does for timers.
declare const require: (id: string) => unknown;
const g = globalThis as unknown as {
  __DEV__?: boolean;
  __RNW_DEV_SERVER?: DevServerInfo;
  __METRO_GLOBAL_PREFIX__?: string;
  WebSocket?: new (url: string) => unknown;
  console: {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
  setTimeout: (cb: () => void, ms?: number) => number;
  [key: string]: unknown;
};

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  install();
}

function install(): void {
  // `react-refresh/runtime` must resolve from a node_modules visible to the
  // consumer's bundle. Consumers using pnpm need to add `react-refresh` as
  // an explicit dep (it's a transitive of react-native but pnpm strict
  // mode doesn't hoist transitives). See example/package.json.
  let refresh: RefreshRuntime;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    refresh = require('react-refresh/runtime') as RefreshRuntime;
  } catch (e) {
    g.console.warn(
      '@appsent-co/react-native-watchos: react-refresh/runtime not found — HMR disabled. ' +
        'Add `react-refresh` to your app dependencies.'
    );
    return;
  }

  refresh.injectIntoGlobalHook(globalThis);

  const refreshGlobal: ReactRefreshGlobal = {
    register: refresh.register,
    createSignatureFunctionForTransform:
      refresh.createSignatureFunctionForTransform,
    isLikelyComponentType: refresh.isLikelyComponentType,
    getFamilyByType: refresh.getFamilyByType,
    performReactRefresh() {
      refresh.performReactRefresh();
    },
    performFullRefresh(reason: string) {
      // The Swift host installs `__RNW_RELOAD` — fire-and-forget; it hops
      // off the JS callstack and triggers a fresh bundle download + eval.
      // Fall back to a console warning + the shake-to-reload dev menu if
      // we're somehow running against an older host.
      const reload = (g as { __RNW_RELOAD?: () => void }).__RNW_RELOAD;
      if (typeof reload === 'function') {
        g.console.warn(`Fast Refresh: full reload (${reason})`);
        reload();
        return;
      }
      g.console.warn(
        `@appsent-co/react-native-watchos: full refresh requested (${reason}) — no ` +
          'reload handler installed; shake the watch to reload.'
      );
    },
  };
  const prefix = g.__METRO_GLOBAL_PREFIX__ ?? '';
  g[prefix + '__ReactRefresh'] = refreshGlobal;

  const dev = g.__RNW_DEV_SERVER;
  if (!dev) {
    // Either the consumer is using a static bundle, or the Swift host is
    // older than this dev-support module. Refresh hooks are still installed,
    // so a manual reload still picks up new component definitions.
    return;
  }
  if (typeof g.WebSocket !== 'function') {
    g.console.warn(
      '@appsent-co/react-native-watchos: globalThis.WebSocket missing — HMR transport disabled.'
    );
    return;
  }
  connect(dev);
}

// Minimal HMR client. The wire format mirrors `metro-runtime`'s HMRClient
// exactly — `register-entrypoints`, `update`, `update-done`, `error` —
// but we inline it here so the library doesn't need `metro-runtime` to be
// resolvable from its own package directory.
function connect(dev: DevServerInfo): void {
  const scheme = dev.scheme === 'https' ? 'wss' : 'ws';
  const wsURL = `${scheme}://${dev.host}:${dev.port}/hot`;
  const entryURL =
    `${dev.scheme}://${dev.host}:${dev.port}/hot?` +
    `bundleEntry=${encodeURIComponent(dev.entry)}&platform=watchos`;

  const WS = g.WebSocket as new (url: string) => {
    onopen: ((e: unknown) => void) | null;
    onmessage: ((e: { data: string }) => void) | null;
    onerror: ((e: { message?: string }) => void) | null;
    onclose: ((e: { code?: number; reason?: string }) => void) | null;
    send(data: string): void;
    close(): void;
  };

  let socket: ReturnType<typeof connectOnce> | null = null;
  let reconnectTimer: number | undefined;
  let attempt = 0;

  // Reconnect with backoff so Metro restarts don't strand the runtime
  // permanently. Cap at 10s to keep the dev loop snappy.
  const scheduleReconnect = (): void => {
    if (reconnectTimer != null) return;
    const delay = Math.min(10000, 500 * Math.pow(2, attempt));
    attempt += 1;
    reconnectTimer = g.setTimeout(() => {
      reconnectTimer = undefined;
      socket = connectOnce();
    }, delay);
  };

  const connectOnce = (): { ws: InstanceType<typeof WS> } => {
    const ws = new WS(wsURL);
    let open = false;

    ws.onopen = () => {
      open = true;
      attempt = 0;
      ws.send(
        JSON.stringify({
          type: 'register-entrypoints',
          entryPoints: [entryURL],
        })
      );
      // Opt into log forwarding so the dev server can surface client logs.
      ws.send(JSON.stringify({ type: 'log-opt-in' }));
    };

    ws.onmessage = (event) => {
      let msg: { type: string; body?: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'bundle-registered':
        case 'update-start':
        case 'update-done':
          break;
        case 'update': {
          const body = msg.body as
            | undefined
            | {
                added?: { module: [number, string]; sourceURL: string }[];
                modified?: { module: [number, string]; sourceURL: string }[];
                deleted?: number[];
              };
          if (!body) break;
          const inject = (item: {
            module: [number, string];
            sourceURL: string;
          }): void => {
            const [id, code] = item.module;
            try {
              const evalWithUrl = (
                g as unknown as {
                  globalEvalWithSourceUrl?: (
                    code: string,
                    sourceURL: string
                  ) => unknown;
                }
              ).globalEvalWithSourceUrl;
              if (typeof evalWithUrl === 'function') {
                evalWithUrl(code, item.sourceURL);
              } else {
                // Hermes always provides eval(); fall back to it. Stack
                // traces just lose their sourceURL annotation.
                // eslint-disable-next-line no-eval
                (0, eval)(code);
              }
            } catch (e) {
              const err = e as { message?: string; stack?: string };
              g.console.error(
                `HMR eval failed for module ${id}: ${err?.message ?? e}`
              );
              if (err?.stack) g.console.error(err.stack);
            }
          };
          body.added?.forEach(inject);
          body.modified?.forEach(inject);
          // Metro's HMRClient ignores `deleted` IDs — the module's
          // accept-handler stops re-running its body, which is enough.
          break;
        }
        case 'error':
          g.console.error('HMR error', msg.body);
          break;
        default:
          break;
      }
    };

    ws.onerror = (e) => {
      if (!open) {
        // Connect failure (Metro not up yet, or wrong host). Reconnect
        // attempts will keep trying until Metro shows up.
        g.console.warn('HMR connect failed:', e?.message ?? 'unknown');
      }
    };

    ws.onclose = () => {
      open = false;
      scheduleReconnect();
    };

    return { ws };
  };

  socket = connectOnce();
  // Touch `socket` to keep TS happy — the reference is held implicitly
  // by the WebSocket itself (URLSession retains the task), but we want
  // a JS reference too so it isn't collected if the runtime ever adds a
  // GC roundtrip beyond the WHATWG spec.
  (g as { __RNW_HMR_SOCKET?: typeof socket }).__RNW_HMR_SOCKET = socket;
}
