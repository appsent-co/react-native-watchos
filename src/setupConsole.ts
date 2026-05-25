// Rich `console` shim. The Hermes host installs `globalThis.__RNW_log(level,
// message)` plus a one-arg `console` bootstrap that just coerces via
// `String()`. This module overrides that with multi-arg formatting +
// `JSON.stringify` for objects, matching what the native side used to do
// inline.
//
// Loaded as the very first side-effect import from `polyfills.ts` so the
// rich shim is in place before anything in the bundle logs.

type LogLevel = 'log' | 'warn' | 'error' | 'info';

type LogBridge = (level: LogLevel, message: string) => void;

const g = globalThis as unknown as {
  __RNW_log?: LogBridge;
  console?: Record<LogLevel, (...args: unknown[]) => void>;
};

// Without `__RNW_log` we'd silently drop logs — the host should always
// install it before bundle eval, but bail out gracefully if it didn't.
if (typeof g.__RNW_log === 'function') {
  const bridge = g.__RNW_log;

  const formatOne = (value: unknown, seen: WeakSet<object>): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Error) {
      // Errors don't have enumerable own props, so JSON.stringify returns
      // "{}" — useless. Prefer the stack (with message baked in) which is
      // what every console implementation does.
      return value.stack || `${value.name}: ${value.message}`;
    }
    if (typeof value === 'object') {
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);
      try {
        return JSON.stringify(value, (_key, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[Circular]';
            seen.add(v);
          }
          return v;
        });
      } catch {
        return '[object]';
      }
    }
    // function, symbol, bigint, etc.
    return String(value);
  };

  const format = (args: unknown[]): string => {
    const seen = new WeakSet<object>();
    let out = '';
    for (let i = 0; i < args.length; i++) {
      if (i > 0) out += ' ';
      out += formatOne(args[i], seen);
    }
    return out;
  };

  const make = (level: LogLevel) => (...args: unknown[]): void => {
    bridge(level, format(args));
  };

  g.console = {
    log: make('log'),
    warn: make('warn'),
    error: make('error'),
    info: make('info'),
  };
}

export {};
