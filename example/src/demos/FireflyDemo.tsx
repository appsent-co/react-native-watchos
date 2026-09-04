import { useEffect, useState } from 'react';
import { open } from '@op-engineering/op-sqlite';
// The canary uses the TurboModule spec directly: it is the only driver
// module whose evaluation needs nothing but `TurboModuleRegistry`, which
// the watch shim serves. (This deep import works because the published
// driver has no `exports` map; the workspace pnpm patch on
// @fireflydb/op-sqlite-driver@1.0.18 re-exports getLibraryPath/getEntryPoint
// from the package entry so consumers stop needing it once the entry itself
// evaluates on the watch — see `loadDriverEntry`.)
import NativeFireflyClient from '@fireflydb/op-sqlite-driver/src/NativeFireflyClient';
import {
  Text,
  VStack,
  font,
  foregroundStyle,
} from '@appsent-co/react-native-watchos/renderer';

/// Stage 1 canary for the FireflyDB proof of concept: load the libfirefly
/// SQLite extension (shipped as Firefly.framework inside the driver's
/// xcframework) into an op-sqlite FILE database and count the `firefly*`
/// SQL functions it registered. A count > 0 means dlopen + entry point +
/// registration all worked on this device.
const CANARY_SQL =
  "SELECT count(*) AS n FROM pragma_function_list WHERE name LIKE 'firefly%'";

type DriverEntry = typeof import('@fireflydb/op-sqlite-driver');

/// Package-entry probe. For `?platform=watchos` Metro resolves
/// '@fireflydb/op-sqlite-driver' to the driver's `src/index.watchos.ts`
/// (never the iOS `src/index.ts` + react-native-get-random-values polyfill),
/// which is the resolution Stage 2/4 rely on. The entry pulls in
/// `@fireflydb/core`, so evaluating it also exercises that package on the
/// watch runtime. It is `require`d lazily so a module-evaluation failure
/// (a missing global, say) is reported here instead of killing the bundle.
///
/// `src/index.watchos.ts` wraps `createFireflyClient` in a guard that throws a
/// watchOS-specific message before touching its argument when
/// `crypto.getRandomValues` is missing; the iOS entry has no such guard, so
/// seeing that message is direct evidence the `.watchos.ts` entry was picked.
/// The runtime now installs `crypto.getRandomValues` (Stage 2), so the probe
/// hides it for the duration of one call to make the guard observable.
interface DriverEntryProbe {
  /** The evaluated package entry, or null when evaluation threw. */
  entry: DriverEntry | null;
  /** Human-readable outcome for the on-screen/log record. */
  status: string;
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function loadDriverEntry(): DriverEntryProbe {
  // Metro's `guardedLoadModule` does not rethrow a module factory error: it
  // hands it to `ErrorUtils.reportFatalError` and returns `undefined`. Swap
  // the global handler for the duration of the require so the real error
  // is captured here instead of only surfacing as a Metro "ErrorUtils fatal"
  // line.
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike })
    .ErrorUtils;
  const previous = errorUtils?.getGlobalHandler();
  let captured: unknown;
  errorUtils?.setGlobalHandler((error) => {
    captured = error;
  });
  let entry: DriverEntry | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    entry = require('@fireflydb/op-sqlite-driver') as DriverEntry | undefined;
  } catch (e) {
    captured = e;
  } finally {
    if (errorUtils && previous) errorUtils.setGlobalHandler(previous);
  }
  if (entry == null) {
    return {
      entry: null,
      status: `eval failed: ${captured == null ? 'unknown' : errorMessage(captured)}`,
    };
  }
  let resolved = 'unknown (createFireflyClient did not throw)';
  const crypto = (globalThis as { crypto?: { getRandomValues?: unknown } })
    .crypto;
  const getRandomValues = crypto?.getRandomValues;
  try {
    if (crypto) delete crypto.getRandomValues;
    entry.createFireflyClient({} as never);
  } catch (e) {
    const message = errorMessage(e);
    resolved = message.includes('watchOS runtime')
      ? 'index.watchos.ts'
      : `unknown (${message})`;
  } finally {
    if (crypto && getRandomValues) crypto.getRandomValues = getRandomValues;
  }
  return { entry, status: `ok (${resolved})` };
}

interface CanaryResult {
  path: string;
  entryPoint: string;
  count: number;
  /** Outcome of `loadDriverEntry`, for the on-screen/log record. */
  driverEntry: string;
}

export function FireflyDemo() {
  const [result, setResult] = useState<CanaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let path = '<unresolved>';
    try {
      const probe = loadDriverEntry();
      const driverEntry = probe.status;
      // Prefer the package-entry API (pnpm patch) when the entry evaluates;
      // fall back to the TurboModule spec otherwise.
      const api: Pick<
        typeof NativeFireflyClient,
        'getLibraryPath' | 'getEntryPoint'
      > = probe.entry ?? NativeFireflyClient;
      // A file database: the extension is loaded per connection and this
      // is the shape the real client uses.
      const db = open({ name: 'firefly-demo.db' });
      path = api.getLibraryPath();
      const entryPoint = api.getEntryPoint();
      db.loadExtension(path, entryPoint);
      const rows = db.executeSync(CANARY_SQL).rows ?? [];
      const count = Number((rows[0] as { n?: number } | undefined)?.n ?? 0);
      console.log(
        `[FireflyDemo] canary=${count} driverEntry=${driverEntry} path=${path}`
      );
      setResult({ path, entryPoint, count, driverEntry });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`[FireflyDemo] error=${message} path=${path}`);
      setError(message);
    }
  }, []);

  if (error != null) {
    return (
      <VStack spacing={4}>
        <Text modifiers={[font({ style: 'headline' })]}>Firefly</Text>
        <Text modifiers={[foregroundStyle('red')]}>{error}</Text>
      </VStack>
    );
  }

  if (result == null) {
    return (
      <VStack>
        <Text>Loading…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ style: 'headline' })]}>Firefly</Text>
      <Text modifiers={[foregroundStyle('secondary'), font({ style: 'caption' })]}>
        {CANARY_SQL}
      </Text>
      <Text>canary = {result.count}</Text>
      <Text modifiers={[font({ style: 'caption' })]}>
        entry {result.entryPoint}
      </Text>
      <Text modifiers={[font({ style: 'caption2' })]}>
        driver entry: {result.driverEntry}
      </Text>
      <Text modifiers={[foregroundStyle('secondary'), font({ style: 'caption2' })]}>
        {result.path}
      </Text>
    </VStack>
  );
}
