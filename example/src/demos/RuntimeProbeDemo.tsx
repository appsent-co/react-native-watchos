import { useEffect, useState } from 'react';
import { open } from '@op-engineering/op-sqlite';
import {
  Text,
  VStack,
  font,
  foregroundStyle,
} from '@appsent-co/react-native-watchos/renderer';

/// Regression probe for the watch runtime's globals — every one the
/// FireflyDB JS SDK (`@fireflydb/core` + `@fireflydb/op-sqlite-driver`)
/// touches, asserted against the exact shape the SDK uses (the source
/// location is named next to each check). It mounts at app launch like every
/// gallery demo, so the result shows up in Metro without navigating:
///
///   [RuntimeProbe] PASS <name>: <detail>
///   [RuntimeProbe] FAIL <name>: <detail>
///   [RuntimeProbe] DONE pass=<n> fail=<m>
///
/// The last four checks load the SDK packages themselves, exercise device
/// keys with the SDK's InMemorySecureStorage, and run
/// `createFireflyClient(...).init()` offline over an app-owned op-sqlite
/// handle with bundled migrations. Device keys are ephemeral: they live
/// only in each probe's in-memory store and are lost when it is discarded.

// ---------------------------------------------------------------------------
// Globals under test, typed loosely on purpose: the probe must compile (and
// report a clean FAIL) when one of them is missing from the runtime.
// ---------------------------------------------------------------------------

interface HermesInternalLike {
  enablePromiseRejectionTracker?: unknown;
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

const G = globalThis as unknown as {
  atob?: (s: string) => string;
  btoa?: (s: string) => string;
  queueMicrotask?: (cb: () => void) => void;
  setImmediate?: (cb: () => void) => unknown;
  setTimeout: (cb: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  setInterval: (cb: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  WebSocket?: unknown;
  Buffer?: unknown;
  HermesInternal?: HermesInternalLike;
  ErrorUtils?: ErrorUtilsLike;
  console: { error: (...args: unknown[]) => void };
};

type DriverEntry = typeof import('@fireflydb/op-sqlite-driver');
type CoreEntry = typeof import('@fireflydb/core');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function errorName(e: unknown): string {
  return e instanceof Error ? e.name : typeof e;
}

/// Runs `fn` and returns the error it threw; fails when it did not throw.
function expectThrow(fn: () => unknown, what: string): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error(`${what} did not throw`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => G.setTimeout(resolve, ms));
}

function hex(u8: Uint8Array): string {
  let out = '';
  for (let i = 0; i < u8.length; i++)
    out += u8[i]!.toString(16).padStart(2, '0');
  return out;
}

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000)
      out.push(
        0xe0 | (cp >> 12),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
  }
  return Uint8Array.from(out);
}

/// Same shape as `@fireflydb/core` src/base64.ts `bytesToBase64Fallback` —
/// the branch that is live on this runtime (no `Uint8Array#toBase64`, no
/// `Buffer`).
function bytesToBase64Fallback(b: Uint8Array): string {
  assert(typeof G.btoa === 'function', 'btoa is missing');
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < b.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      b.subarray(i, i + CHUNK) as unknown as number[]
    );
  }
  return G.btoa(bin);
}

function base64ToBytesFallback(s: string): Uint8Array {
  assert(typeof G.atob === 'function', 'atob is missing');
  const bin = G.atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/// `require` a package with the module-factory error captured. Metro's
/// `guardedLoadModule` does not rethrow a factory throw: it hands it to
/// `ErrorUtils.reportFatalError` and returns `undefined`, so the global
/// handler is swapped for the duration of the load and the real error
/// surfaces here instead of only as a Metro "ErrorUtils fatal" line.
function requireGuarded<T>(load: () => T | undefined, what: string): T {
  const errorUtils = G.ErrorUtils;
  const previous = errorUtils?.getGlobalHandler();
  let captured: unknown;
  errorUtils?.setGlobalHandler((error) => {
    captured = error;
  });
  let entry: T | undefined;
  try {
    entry = load();
  } catch (e) {
    captured = e;
  } finally {
    if (errorUtils && previous) errorUtils.setGlobalHandler(previous);
  }
  if (entry == null) {
    throw new Error(
      `${what} failed to evaluate: ${captured == null ? 'unknown' : errorMessage(captured)}`
    );
  }
  return entry;
}

let driverEntry: DriverEntry | null = null;

function loadDriverEntry(): DriverEntry {
  if (driverEntry == null) {
    driverEntry = requireGuarded<DriverEntry>(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      () => require('@fireflydb/op-sqlite-driver') as DriverEntry | undefined,
      '@fireflydb/op-sqlite-driver'
    );
  }
  return driverEntry;
}

let coreEntry: CoreEntry | null = null;

function loadCore(): CoreEntry {
  if (coreEntry == null) {
    coreEntry = requireGuarded<CoreEntry>(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      () => require('@fireflydb/core') as CoreEntry | undefined,
      '@fireflydb/core'
    );
  }
  return coreEntry;
}

// ---------------------------------------------------------------------------
// Signed-migration fixture for `client-init`. The SDK only consumes
// envelopes (core/src/protocol/migration.ts reads the seq; the encoder is
// libfirefly's core/src/migration.rs and the relay's Go signer), so the probe
// packs the one-envelope chain it needs itself:
//
//   header = "FMIG" | u8 1 | u64be seq | u32be len | filename
//          | prev_hash (32 bytes, zeros for seq 1) | u64be migration_ts (ms)
//          | u32be len | sql
//   wire   = header | ed25519(header, developer private key)
//
// The signature is the SDK's own `signDeviceProof` (@noble/ed25519 over the
// header bytes), which is the primitive libfirefly's `verify_strict`
// checks. The developer key is derived from a fixed 32-byte seed with
// `deriveDeviceKey` — an Ed25519 keypair like the device key, and
// deterministic so the pubkey pinned into `_firefly_config` agrees from one
// launch to the next.
// ---------------------------------------------------------------------------

const PROBE_DEV_SEED = new Uint8Array(32).fill(0x2a);
const PROBE_MIGRATION_TS = Date.UTC(2026, 8, 4);
const PROBE_TABLE = 'rnw_probe_notes';
const PROBE_MIGRATION_SQL =
  `CREATE TABLE IF NOT EXISTS ${PROBE_TABLE} (id TEXT PRIMARY KEY NOT NULL, body TEXT);\n` +
  `SELECT firefly_track_table('${PROBE_TABLE}', false);`;

function buildSignedEnvelope(
  core: CoreEntry,
  developerSeed: Uint8Array,
  env: {
    seq: number;
    filename: string;
    prevHash: Uint8Array;
    migrationTs: number;
    sql: string;
  }
): Uint8Array {
  const filename = utf8Encode(env.filename);
  const sql = utf8Encode(env.sql);
  const header = new Uint8Array(
    4 + 1 + 8 + 4 + filename.length + 32 + 8 + 4 + sql.length
  );
  const view = new DataView(header.buffer);
  header.set([0x46, 0x4d, 0x49, 0x47], 0); // "FMIG"
  header[4] = 1;
  view.setBigUint64(5, BigInt(env.seq), false);
  let p = 13;
  view.setUint32(p, filename.length, false);
  p += 4;
  header.set(filename, p);
  p += filename.length;
  header.set(env.prevHash, p);
  p += 32;
  view.setBigUint64(p, BigInt(env.migrationTs), false);
  p += 8;
  view.setUint32(p, sql.length, false);
  p += 4;
  header.set(sql, p);
  const signature = core.signDeviceProof(header, developerSeed);
  assert(signature.length === 64, `signature length ${signature.length}`);
  const wire = new Uint8Array(header.length + 64);
  wire.set(header, 0);
  wire.set(signature, header.length);
  return wire;
}

interface ProbeDb {
  execute(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows?: Record<string, unknown>[] }>;
}

async function scalar<T>(
  db: ProbeDb,
  sql: string,
  column: string
): Promise<T | undefined> {
  const rows = (await db.execute(sql)).rows ?? [];
  return rows[0]?.[column] as T | undefined;
}

// ---------------------------------------------------------------------------
// Checks. Each resolves with a one-line detail or throws.
// ---------------------------------------------------------------------------

type Check = () => Promise<string> | string;

const CHECKS: readonly [string, Check][] = [
  // -- base64 ---------------------------------------------------------------

  [
    'atob-btoa-roundtrip',
    () => {
      // core/src/base64.ts fallback pair over 0x8000 chunks; 32773 bytes
      // crosses a chunk boundary and ends on a partial quantum.
      const src = new Uint8Array(32773);
      for (let i = 0; i < src.length; i++) src[i] = (i * 31 + 7) & 0xff;
      const b64 = bytesToBase64Fallback(src);
      const back = base64ToBytesFallback(b64);
      assert(bytesEqual(src, back), `round trip differs (len ${back.length})`);
      return `${src.length} bytes ↔ ${b64.length} chars byte-exact`;
    },
  ],
  [
    'atob-invalid',
    () => {
      assert(typeof G.atob === 'function', 'atob missing');
      const atob = G.atob;
      const bad = expectThrow(() => atob('!!!!'), "atob('!!!!')");
      const len = expectThrow(() => atob('abcde'), "atob('abcde')");
      return `'!!!!' → ${errorMessage(bad)}; 'abcde' → ${errorMessage(len)}`;
    },
  ],
  [
    'btoa-range',
    () => {
      assert(typeof G.btoa === 'function', 'btoa missing');
      const btoa = G.btoa;
      const e = expectThrow(() => btoa('Ā'), "btoa('\\u0100')");
      return `U+0100 → ${errorMessage(e)}`;
    },
  ],
  [
    'base64url',
    () => {
      // core/src/keys.ts base64UrlEncode of a 32-byte public key.
      assert(typeof G.btoa === 'function', 'btoa missing');
      const key = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
      let bin = '';
      for (let i = 0; i < key.length; i++) bin += String.fromCharCode(key[i]!);
      const peerId = G.btoa(bin)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      assert(peerId.length === 43, `length ${peerId.length}, expected 43`);
      assert(!/[+/=]/.test(peerId), `contains + / or =: ${peerId}`);
      return `43 chars, url-safe: ${peerId}`;
    },
  ],
  [
    'base64-selection',
    () => {
      // Documents which branch of core/src/base64.ts is live here.
      const proto = Uint8Array.prototype as { toBase64?: unknown };
      const ctor = Uint8Array as unknown as { fromBase64?: unknown };
      return `Uint8Array#toBase64=${typeof proto.toBase64} Uint8Array.fromBase64=${typeof ctor.fromBase64} Buffer=${typeof G.Buffer} → btoa/atob fallback`;
    },
  ],

  // -- binary + numeric -----------------------------------------------------

  [
    'dataview-bigint64',
    () => {
      // protocol/keys.ts encodeKeysU32 / decodeReconcileResult, merged.ts Reader.i64.
      const view = new DataView(new ArrayBuffer(8));
      assert(typeof view.setBigInt64 === 'function', 'setBigInt64 missing');
      view.setBigInt64(0, -9007199254740993n, true);
      const back = view.getBigInt64(0, true);
      assert(back === -9007199254740993n, `readback=${back}`);
      return `-9007199254740993n little-endian round trip, bytes=${hex(new Uint8Array(view.buffer))}`;
    },
  ],
  [
    'bigint-arith',
    () => {
      // protocol/cells.ts varint accumulation above 2^53.
      const sum = (1n << 62n) + 12345n;
      assert(sum === 4611686018427400249n, `(1n<<62n)+12345n = ${sum}`);
      const parsed = BigInt('9007199254740993');
      assert(
        String(parsed) === '9007199254740993',
        `BigInt('9007199254740993') = ${parsed} (2^53+1 must not round)`
      );
      return `exact above 2^53 (${sum})`;
    },
  ],

  // -- scheduling and iteration --------------------------------------------

  [
    'timers',
    async () => {
      // state/stream.ts sleep, state/gc.ts GC timer.
      let fired = false;
      let cancelled = true;
      let ticks = 0;
      const id = G.setTimeout(() => {
        fired = true;
      }, 10);
      assert(typeof id === 'number', `setTimeout returned ${typeof id}`);
      G.clearTimeout(
        G.setTimeout(() => {
          cancelled = false;
        }, 5)
      );
      const interval = G.setInterval(() => {
        ticks++;
        if (ticks >= 2) G.clearInterval(interval);
      }, 5);
      // The other demos share this serial JS queue at launch (an 8 MiB echo,
      // loading libfirefly), so wait for the ticks rather than assuming
      // wall-clock timing; only the count and the stop are asserted.
      for (let i = 0; i < 100 && ticks < 2; i++) await sleep(50);
      const settled = ticks;
      await sleep(60);
      assert(fired, 'setTimeout did not fire');
      assert(cancelled, 'clearTimeout did not prevent the callback');
      assert(settled >= 2, `setInterval fired ${settled} times`);
      assert(
        ticks === settled,
        `setInterval kept firing after clearInterval (${ticks})`
      );
      return `setTimeout fired, cleared one silent, setInterval ×${settled} then stopped`;
    },
  ],
  [
    'queue-microtask',
    async () => {
      assert(typeof G.queueMicrotask === 'function', 'queueMicrotask missing');
      const order: string[] = [];
      G.setTimeout(() => order.push('timeout'), 0);
      G.queueMicrotask(() => order.push('micro'));
      await sleep(20);
      assert(order.join(',') === 'micro,timeout', `order=${order.join(',')}`);
      return order.join(',');
    },
  ],
  [
    'set-immediate-is-macrotask',
    async () => {
      // Regression guard for src/polyfills.ts scheduleSoon: setImmediate
      // must not become a microtask now that queueMicrotask exists.
      assert(typeof G.setImmediate === 'function', 'setImmediate missing');
      const order: string[] = [];
      G.setImmediate(() => order.push('immediate'));
      Promise.resolve().then(() => order.push('micro'));
      await sleep(20);
      assert(order.join(',') === 'micro,immediate', `order=${order.join(',')}`);
      return order.join(',');
    },
  ],
  [
    'async-iterator-symbol',
    () => {
      const sym = (Symbol as { asyncIterator?: unknown }).asyncIterator;
      assert(
        typeof sym === 'symbol',
        `typeof Symbol.asyncIterator=${typeof sym}`
      );
      return `typeof symbol (${String(sym)})`;
    },
  ],
  [
    'for-await',
    async () => {
      // core/src/drivers/wsRecvQueue.ts iterate() shape, consumed by
      // state/session.ts with for-await.
      const items = [1, 2, 3, 4];
      let index = 0;
      const iterable: AsyncIterableIterator<number> = {
        [Symbol.asyncIterator]() {
          return this;
        },
        next(): Promise<IteratorResult<number>> {
          return Promise.resolve(
            index < items.length
              ? { value: items[index++]!, done: false }
              : { value: undefined, done: true }
          );
        },
        return(): Promise<IteratorResult<number>> {
          return Promise.resolve({ value: undefined, done: true });
        },
      };
      let sum = 0;
      for await (const v of iterable) sum += v;
      assert(sum === 10, `sum=${sum}`);
      return `sum=${sum}`;
    },
  ],
  [
    'unhandled-rejection',
    async () => {
      // src/polyfills.ts routes Hermes' rejection tracker to console.error;
      // intercept that for one unhandled rejection, then handle it.
      assert(
        typeof G.HermesInternal?.enablePromiseRejectionTracker === 'function',
        'HermesInternal.enablePromiseRejectionTracker missing'
      );
      const marker = 'rnw-probe-unhandled-rejection';
      const original = G.console.error;
      let seen: string | null = null;
      G.console.error = (...args: unknown[]) => {
        const line = args.map(String).join(' ');
        if (line.includes(marker)) seen = line.split('\n')[0] ?? line;
        else original(...args);
      };
      const rejected = Promise.reject(new Error(marker));
      try {
        for (let i = 0; i < 40 && seen === null; i++) await sleep(50);
      } finally {
        G.console.error = original;
        rejected.catch(() => undefined);
      }
      assert(seen !== null, 'tracker did not report within 2s');
      return `tracker fired: ${seen}`;
    },
  ],

  // -- platform -------------------------------------------------------------

  [
    'websocket-present',
    () => {
      // Conformance is WebSocketDemo's job; only presence is asserted here.
      assert(typeof G.WebSocket === 'function', `typeof=${typeof G.WebSocket}`);
      return 'typeof=function (conformance: WebSocketDemo)';
    },
  ],
  [
    'driver-entry',
    () => {
      // Metro resolves this to the driver's src/index.watchos.ts; it pulls
      // in @fireflydb/core, which builds TextDecoders at module scope.
      const entry = loadDriverEntry();
      const wanted = [
        'createFireflyClient',
        'loadOrCreateDeviceKey',
        'generateDeviceKey',
        'deriveDeviceKey',
        'InMemorySecureStorage',
        'getLibraryPath',
        'getEntryPoint',
      ] as const;
      const missing = wanted.filter(
        (name) => typeof (entry as Record<string, unknown>)[name] !== 'function'
      );
      assert(missing.length === 0, `missing exports: ${missing.join(', ')}`);
      return `evaluates; ${wanted.join(', ')} present (${Object.keys(entry).length} exports)`;
    },
  ],
  [
    'core-entry',
    () => {
      const core = loadCore();
      assert(
        typeof core.FireflyClient === 'function',
        'FireflyClient export missing'
      );
      assert(
        typeof core.loadOrCreateDeviceKey === 'function',
        'loadOrCreateDeviceKey export missing'
      );
      return `evaluates; FireflyClient + loadOrCreateDeviceKey present (${Object.keys(core).length} exports)`;
    },
  ],
  [
    'device-key',
    async () => {
      // End-to-end: getRandomValues → @noble/ed25519 (sha512Sync from
      // @noble/hashes, no crypto.subtle) → base64url peerID.
      const entry = loadDriverEntry();
      const store = new entry.InMemorySecureStorage();
      const t0 = Date.now();
      const first = await entry.loadOrCreateDeviceKey(store);
      const coldMs = Date.now() - t0;
      assert(first.seed.length === 32, `seed length ${first.seed.length}`);
      assert(
        first.publicKey.length === 32,
        `publicKey length ${first.publicKey.length}`
      );
      assert(
        first.peerID.length === 43,
        `peerID length ${first.peerID.length}`
      );
      const again = await entry.loadOrCreateDeviceKey(store);
      assert(
        again.peerID === first.peerID,
        'same store yielded a different peerID'
      );
      const other = await entry.loadOrCreateDeviceKey(
        new entry.InMemorySecureStorage()
      );
      assert(
        other.peerID !== first.peerID,
        'fresh store reproduced the peerID'
      );
      return `seed=32 pub=32 peerID=${first.peerID} (ephemeral memory: stable on the same store, distinct on a fresh one, ${coldMs}ms cold)`;
    },
  ],
  [
    'client-init',
    async () => {
      // `createFireflyClient(...).init()` offline using the driver's watch
      // entry over an app-owned op-sqlite handle, the SDK's in-memory
      // device-key store, a developer pubkey and one bundled signed migration.
      // Both clients below share this store for this check only. `init()` is
      // loadOrCreateDeviceKey → OpSqliteDriver.open (WAL + libfirefly loaded
      // onto the handle) → firefly_init → pin developer_pubkey (base64url
      // via btoa) → applyBundledMigrations (DataView / BigInt
      // over the FMIG envelope) → the change-listener GC nudger. Nothing
      // touches the network. The DB file is deleted afterwards so every
      // launch runs the whole path on a fresh database.
      const entry = loadDriverEntry();
      const core = loadCore();
      const developer = entry.deriveDeviceKey(PROBE_DEV_SEED);
      const envelope = buildSignedEnvelope(core, developer.seed, {
        seq: 1,
        filename: '0001_rnw_probe.sql',
        prevHash: new Uint8Array(32),
        migrationTs: PROBE_MIGRATION_TS,
        sql: PROBE_MIGRATION_SQL,
      });
      assert(
        core.readEnvelopeSeq(envelope) === 1,
        'fixture envelope does not decode to seq 1'
      );
      const store = new entry.InMemorySecureStorage();
      const db = open({ name: 'rnw-probe-client.db' });
      const probeDb = db as unknown as ProbeDb;
      const make = () =>
        entry.createFireflyClient({
          databaseID: 'rnw-probe',
          dbName: 'rnw-probe',
          relayUrl: 'wss://relay.invalid/v1/sync',
          developerPubkey: developer.publicKey,
          migrations: [envelope],
          token: { getToken: async () => '' },
          secureStorage: store,
          sqliteOptions: { db },
        });
      try {
        const client = make();
        const t0 = Date.now();
        await client.init();
        const ms = Date.now() - t0;
        const peerID = client.peerID;
        assert(peerID.length === 43, `peerID length ${peerID.length}`);
        // The in-memory seed derives to the client's peer.
        const stored = await store.get('fireflydb.device.seed');
        assert(stored !== null, 'device seed missing from memory after init()');
        assert(
          entry.deriveDeviceKey(stored).peerID === peerID,
          'in-memory seed does not derive to client.peerID'
        );
        const pinned = await scalar<string>(
          probeDb,
          "SELECT value FROM _firefly_config WHERE key = 'developer_pubkey'",
          'value'
        );
        const expected = core.base64UrlEncode(developer.publicKey);
        assert(
          pinned === expected,
          `developer_pubkey pinned as ${String(pinned)}, want ${expected}`
        );
        const head = await scalar<number>(
          probeDb,
          'SELECT seq FROM _firefly_migration_chain ORDER BY seq DESC LIMIT 1',
          'seq'
        );
        assert(
          Number(head) === 1,
          `migration chain head = ${String(head)}, want 1`
        );
        const table = await scalar<string>(
          probeDb,
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${PROBE_TABLE}'`,
          'name'
        );
        assert(
          table === PROBE_TABLE,
          `migration SQL did not create ${PROBE_TABLE}`
        );
        await client.close();
        // A second client over the same handle and in-memory store: the
        // pinned pubkey must agree, the chain head stays at 1 (no re-apply),
        // and the peer is the same for this store's lifetime.
        const again = make();
        await again.init();
        assert(
          again.peerID === peerID,
          `re-init changed the peer (${again.peerID})`
        );
        const headAgain = await scalar<number>(
          probeDb,
          'SELECT seq FROM _firefly_migration_chain ORDER BY seq DESC LIMIT 1',
          'seq'
        );
        assert(
          Number(headAgain) === 1,
          `chain head after re-init = ${String(headAgain)}`
        );
        await again.close();
        return `init() ok in ${ms}ms: peerID=${peerID} (ephemeral in-memory seed agrees), developer_pubkey pinned, migration seq 1 applied (${PROBE_TABLE} created + tracked), re-init over the same handle and memory store idempotent`;
      } finally {
        db.delete();
      }
    },
  ],
];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

function report(line: string): void {
  console.log(line);
}

async function runChecks(
  push: (r: CheckResult) => void
): Promise<{ pass: number; fail: number }> {
  let pass = 0;
  let fail = 0;
  for (const [name, check] of CHECKS) {
    try {
      const detail = await check();
      pass++;
      push({ name, status: 'PASS', detail });
      report(`[RuntimeProbe] PASS ${name}: ${detail}`);
    } catch (e) {
      const detail = errorMessage(e);
      fail++;
      push({ name, status: 'FAIL', detail });
      report(`[RuntimeProbe] FAIL ${name}: ${detail}`);
    }
  }
  report(`[RuntimeProbe] DONE pass=${pass} fail=${fail}`);
  return { pass, fail };
}

export function RuntimeProbeDemo() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    runChecks((r) => {
      if (live) setResults((prev) => [...prev, r]);
    })
      .then((s) => {
        if (live) setSummary(`pass ${s.pass} · fail ${s.fail}`);
      })
      .catch((e: unknown) => {
        report(`[RuntimeProbe] ABORTED: ${errorMessage(e)}`);
        if (live) setSummary(`aborted: ${errorMessage(e)}`);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ style: 'headline' })]}>Runtime probe</Text>
      <Text
        modifiers={[foregroundStyle('secondary'), font({ style: 'caption2' })]}
      >
        {CHECKS.length} checks
      </Text>
      {results.map((r) => (
        <Text
          key={r.name}
          modifiers={[
            font({ style: 'caption2' }),
            foregroundStyle(r.status === 'PASS' ? 'green' : 'red'),
          ]}
        >
          {r.status} {r.name}
        </Text>
      ))}
      <Text modifiers={[font({ style: 'caption' })]}>
        {summary ?? 'running…'}
      </Text>
    </VStack>
  );
}
