// @ts-check

const path = require('path');

const WATCHOS_PLATFORM = 'watchos';
const WATCHOS_CONDITIONS = ['react-native'];
const LOG_PATH = '/__watchos_log';
// Tiny stand-in for the `react-native` package. Aliasing the bare name to
// this file on `watchos` keeps `TurboModuleRegistry` reachable via the
// standard `import ... from 'react-native'` ergonomic without dragging in
// RN's bridge / UIManager / DevTools graph — much of which references
// `.ios.js`/`.android.js` files that don't exist on watchos. See the
// shim's own header for the full story.
const REACT_NATIVE_SHIM = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'reactNativeShim.ts'
);
const SUPPORT_PACKAGE_PATCHED = Symbol.for(
  '@appsent-co/react-native-watchos:supportPackagePatched'
);

/**
 * Extend a Metro config so that Metro recognises `watchos` as a platform
 * AND exposes a tiny POST endpoint at `/__watchos_log` that the watchOS
 * host posts JS errors / logs to. Anything received there is printed to
 * the Metro CLI terminal so the watch can surface failures without
 * needing the device-side error screen.
 *
 * With `watchos` registered, the resolver tries `foo.watchos.{ts,tsx,js,jsx}`
 * before falling back to `foo.{ts,tsx,js,jsx}` whenever Metro is asked for
 * a bundle with `?platform=watchos`. That lets a single Expo app keep an
 * iOS entry (`index.ts`) alongside a Hermes-only watch entry
 * (`index.watchos.ts`).
 *
 * Usage (in the consumer's `metro.config.js`):
 *
 *   const { getDefaultConfig } = require('expo/metro-config');
 *   const { withWatchosMetro } = require('@appsent-co/react-native-watchos/metro-config');
 *
 *   module.exports = withWatchosMetro(getDefaultConfig(__dirname));
 *
 * The function mutates and returns the same config object. It is safe to
 * call more than once — `watchos` is only added if it isn't already there.
 *
 * @template {{ projectRoot?: string, resolver?: any, server?: any }} TConfig
 * @param {TConfig} config A Metro config (typically from `getDefaultConfig`).
 * @returns {TConfig} The same config, with `watchos` wired in.
 */
function withWatchosMetro(config) {
  patchAutolinkingSupportPackage(config.projectRoot || process.cwd());

  const resolver = config.resolver || (config.resolver = {});

  const platforms = Array.isArray(resolver.platforms)
    ? resolver.platforms
    : (resolver.platforms = []);
  if (!platforms.includes(WATCHOS_PLATFORM)) {
    platforms.push(WATCHOS_PLATFORM);
  }

  const conditions =
    resolver.unstable_conditionsByPlatform ||
    (resolver.unstable_conditionsByPlatform = {});
  if (!conditions[WATCHOS_PLATFORM]) {
    conditions[WATCHOS_PLATFORM] = [...WATCHOS_CONDITIONS];
  }

  // Redirect bare `react-native` imports to our shim on watchos. The shim
  // exposes just `TurboModuleRegistry` + the `TurboModule` brand type; any
  // other RN API would crash at runtime in this bridge-less runtime, so it
  // intentionally isn't reachable.
  const previousResolveRequest = resolver.resolveRequest;
  resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === WATCHOS_PLATFORM && moduleName === 'react-native') {
      return { type: 'sourceFile', filePath: REACT_NATIVE_SHIM };
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  // Drop react-native's `InitializeCore` polyfill for watchos bundles.
  // It wires up the iOS bridge (NativeModules, BatchedBridge, etc.)
  // and references `__fbBatchedBridgeConfig` — but this runtime has
  // no bridge, just Hermes + our JSI host. In dev the references stay
  // lazy and nothing trips; the production bundle inlines requires and
  // the eager evaluation throws "__fbBatchedBridgeConfig is not set".
  //
  // Keep Metro's base polyfills (console, error-guard, Object.es8) —
  // they're pure JS and harmless on Hermes.
  const serializer = config.serializer || (config.serializer = {});
  const previousGetPolyfills = serializer.getPolyfills;
  serializer.getPolyfills = (opts) => {
    const all = previousGetPolyfills ? previousGetPolyfills(opts) : [];
    if (opts && opts.platform === WATCHOS_PLATFORM) {
      return all.filter((p) => !/[\\/]react-native[\\/]Libraries[\\/]/.test(p));
    }
    return all;
  };

  const server = config.server || (config.server = {});
  const previousEnhance = server.enhanceMiddleware;
  server.enhanceMiddleware = (middleware, metroServer) => {
    const base = previousEnhance
      ? previousEnhance(middleware, metroServer)
      : middleware;
    return (req, res, next) => {
      if (req.url === LOG_PATH && req.method === 'POST') {
        handleWatchosLog(req, res);
        return;
      }
      base(req, res, next);
    };
  };

  return config;
}

/**
 * Expo CLI 57.0.1+ asks expo-modules-autolinking which package hosts
 * React Native for a platform after every resolution on non-web
 * platforms (to redirect `react-native` on tvOS / macOS forks). The
 * helper throws for platforms it doesn't know, and `watchos` isn't one
 * of them. Wrap Expo's own instance so it answers `null` for watchos,
 * the same as `web`. Expo re-exports the helper through live getters,
 * so replacing it on the source module is enough.
 *
 * @param {string} projectRoot Directory to resolve `expo` from.
 */
function patchAutolinkingSupportPackage(projectRoot) {
  let platforms;
  try {
    const expoExports = require.resolve(
      'expo/internal/unstable-autolinking-exports',
      { paths: [projectRoot] }
    );
    const autolinkingDir = path.dirname(
      require.resolve('expo-modules-autolinking/package.json', {
        paths: [path.dirname(expoExports)],
      })
    );
    platforms = require(path.join(autolinkingDir, 'build', 'platforms'));
  } catch {
    // Older Expo without the helper, or no Expo at all — nothing to do.
    return;
  }

  const original = platforms.getSupportPackageForPlatform;
  if (typeof original !== 'function' || original[SUPPORT_PACKAGE_PATCHED]) {
    return;
  }
  /** @param {string} platform */
  const patched = (platform) =>
    platform === WATCHOS_PLATFORM ? null : original(platform);
  patched[SUPPORT_PACKAGE_PATCHED] = true;
  platforms.getSupportPackageForPlatform = patched;
}

/**
 * Parse the JSON body POSTed by the watchOS host and print it to stderr
 * with a coloured prefix so it stands out among Metro's regular output.
 * Schema: `{ level: "log"|"warn"|"error", message: string, stack?: string }`.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
function handleWatchosLog(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      res.statusCode = 400;
      res.end();
      return;
    }
    const level = String(payload.level || 'log');
    const message = String(payload.message || '');
    const stack = payload.stack ? String(payload.stack) : '';
    // ANSI: red bg for error, yellow for warn, blue for log.
    const tag =
      level === 'error'
        ? '\x1b[41m\x1b[37m watchOS ERR \x1b[0m'
        : level === 'warn'
          ? '\x1b[43m\x1b[30m watchOS WRN \x1b[0m'
          : '\x1b[44m\x1b[37m watchOS LOG \x1b[0m';
    process.stderr.write(`\n${tag} ${message}\n`);
    if (stack) {
      process.stderr.write(stack.replace(/^/gm, '  ') + '\n');
    }
    res.statusCode = 204;
    res.end();
  });
  req.on('error', () => {
    res.statusCode = 500;
    res.end();
  });
}

module.exports = withWatchosMetro;
module.exports.withWatchosMetro = withWatchosMetro;
module.exports.default = withWatchosMetro;
