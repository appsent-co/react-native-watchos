import { useEffect, useState } from 'react';
import { open } from '@op-engineering/op-sqlite';
import {
  Text,
  VStack,
  font,
  foregroundStyle,
} from '@appsent-co/react-native-watchos/renderer';
import { SecureStorage } from '@appsent-co/react-native-watchos/secure-storage';
import type { SecureStorageDriver } from '@fireflydb/op-sqlite-driver';

/// Regression probe for the watch runtime's globals — every one the
/// FireflyDB JS SDK (`@fireflydb/core` + `@fireflydb/op-sqlite-driver`)
/// touches, asserted against the exact shape the SDK uses (the source
/// location is named next to each check), plus the package's own
/// `SecureStorage` module. It mounts at app launch like every gallery demo,
/// so the result shows up in Metro without navigating:
///
///   [RuntimeProbe] PASS <name>: <detail>
///   [RuntimeProbe] FAIL <name>: <detail>
///   [RuntimeProbe] DONE pass=<n> fail=<m>
///
/// The last five checks `require` the SDK packages themselves, so a green
/// run means both evaluate on this runtime; `device-key-keychain` runs
/// `loadOrCreateDeviceKey` through the Keychain-backed `SecureStorageDriver`
/// adapter the docs hand consumers, and `client-init` composes
/// `createFireflyClient(...)` over an app-owned op-sqlite handle the way a
/// consumer does and runs `init()` offline — the Stage 2 gate of the
/// FireflyDB watch proof of concept (WATCHOS_FIREFLY_POC_PLAN.md: "the
/// runtime probe passes and `createFireflyClient(...).init()` succeeds
/// offline on the watch — device key generated and persisted, bundled
/// migrations applied").

// ---------------------------------------------------------------------------
// Globals under test, typed loosely on purpose: the probe must compile (and
// report a clean FAIL) when one of them is missing from the runtime.
// ---------------------------------------------------------------------------

interface DecoderLike {
  encoding: string;
  fatal: boolean;
  ignoreBOM: boolean;
  decode(input?: unknown, options?: { stream?: boolean }): string;
}

interface EncoderLike {
  encoding: string;
  encode(input?: string): Uint8Array;
  encodeInto?: unknown;
}

interface CryptoLike {
  getRandomValues?: <T extends ArrayBufferView>(view: T) => T;
  randomUUID?: () => string;
}

interface HermesInternalLike {
  enablePromiseRejectionTracker?: unknown;
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

const G = globalThis as unknown as {
  crypto?: CryptoLike;
  atob?: (s: string) => string;
  btoa?: (s: string) => string;
  TextEncoder?: new () => EncoderLike;
  TextDecoder?: new (
    label?: string,
    options?: { fatal?: boolean; ignoreBOM?: boolean }
  ) => DecoderLike;
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
  for (let i = 0; i < u8.length; i++) out += u8[i]!.toString(16).padStart(2, '0');
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

function requireDecoder(): NonNullable<typeof G.TextDecoder> {
  assert(typeof G.TextDecoder === 'function', 'TextDecoder is missing');
  return G.TextDecoder;
}

function requireEncoder(): NonNullable<typeof G.TextEncoder> {
  assert(typeof G.TextEncoder === 'function', 'TextEncoder is missing');
  return G.TextEncoder;
}

function requireGrv(): NonNullable<CryptoLike['getRandomValues']> {
  assert(
    typeof G.crypto?.getRandomValues === 'function',
    'crypto.getRandomValues is missing'
  );
  return G.crypto.getRandomValues;
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

// ---------------------------------------------------------------------------
// DOC COPY — the `SecureStorageDriver` adapter from docs/docs/secure-storage.md,
// verbatim. If this runs, what the docs hand a consumer runs.
// ---------------------------------------------------------------------------

export class WatchSecureStorage implements SecureStorageDriver {
  async get(key: string): Promise<Uint8Array | null> {
    const raw = await SecureStorage.getItem(key);
    if (raw === null) return null;
    const bin = atob(raw);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    let bin = '';
    for (let i = 0; i < value.length; i++) bin += String.fromCharCode(value[i]!);
    await SecureStorage.setItem(key, btoa(bin));
  }

  async delete(key: string): Promise<void> {
    await SecureStorage.removeItem(key);
  }
}

/// `loadOrCreateDeviceKey` reads one fixed key (`fireflydb.device.seed`,
/// core/src/keys.ts). Namespacing it keeps the probe from owning the example
/// app's real device seed — the adapter under test is the same either way.
function scoped(store: SecureStorageDriver, prefix: string): SecureStorageDriver {
  return {
    get: (key) => store.get(prefix + key),
    set: (key, value) => store.set(prefix + key, value),
    delete: (key) => store.delete(prefix + key),
  };
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
  env: { seq: number; filename: string; prevHash: Uint8Array; migrationTs: number; sql: string }
): Uint8Array {
  const encoder = new (requireEncoder())();
  const filename = encoder.encode(env.filename);
  const sql = encoder.encode(env.sql);
  const header = new Uint8Array(4 + 1 + 8 + 4 + filename.length + 32 + 8 + 4 + sql.length);
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
  execute(sql: string, params?: unknown[]): Promise<{ rows?: Record<string, unknown>[] }>;
}

async function scalar<T>(db: ProbeDb, sql: string, column: string): Promise<T | undefined> {
  const rows = (await db.execute(sql)).rows ?? [];
  return rows[0]?.[column] as T | undefined;
}

// ---------------------------------------------------------------------------
// Checks. Each resolves with a one-line detail or throws.
// ---------------------------------------------------------------------------

type Check = () => Promise<string> | string;

const CHECKS: readonly [string, Check][] = [
  // -- crypto ---------------------------------------------------------------

  [
    'crypto-present',
    () => {
      assert(
        typeof G.crypto?.getRandomValues === 'function',
        'crypto.getRandomValues missing'
      );
      assert(typeof G.crypto.randomUUID === 'function', 'crypto.randomUUID missing');
      return `getRandomValues+randomUUID, subtle=${typeof (G.crypto as { subtle?: unknown }).subtle}`;
    },
  ],
  [
    'grv-fills',
    () => {
      // core/src/state/sync.ts defaultRandomBytes + @noble/ed25519 randomBytes:
      // a plain Uint8Array, and the RETURN value is what gets used.
      const grv = requireGrv();
      const a = new Uint8Array(32);
      const r = grv(a);
      assert(r === a, 'did not return the same object');
      assert(a.some((b) => b !== 0), 'buffer left zeroed');
      return `same object, ${hex(a).slice(0, 16)}…`;
    },
  ],
  [
    'grv-offset',
    () => {
      const grv = requireGrv();
      const buf = new ArrayBuffer(32);
      const head = new Uint8Array(buf, 0, 16);
      const tail = new Uint8Array(buf, 16, 16);
      grv(tail);
      assert(head.every((b) => b === 0), 'adjacent view was overwritten');
      assert(tail.some((b) => b !== 0), 'offset view left zeroed');
      return 'byteOffset honoured, adjacent view untouched';
    },
  ],
  [
    'grv-typed',
    () => {
      const grv = requireGrv();
      const u32 = grv(new Uint32Array(8));
      assert(u32.some((v) => v !== 0), 'Uint32Array left zeroed');
      const i64 = grv(new BigInt64Array(4));
      assert(i64.some((v) => v !== 0n), 'BigInt64Array left zeroed');
      return `Uint32Array(8) + BigInt64Array(4) filled`;
    },
  ],
  [
    'grv-quota-ok',
    () => {
      const a = requireGrv()(new Uint8Array(65536));
      assert(a.some((b) => b !== 0), 'left zeroed');
      return '65536 bytes accepted';
    },
  ],
  [
    'grv-quota-exceeded',
    () => {
      const e = expectThrow(() => requireGrv()(new Uint8Array(65537)), '65537 bytes');
      assert(errorName(e) === 'QuotaExceededError', `name=${errorName(e)}`);
      return `65537 bytes → ${errorName(e)}`;
    },
  ],
  [
    'grv-type-mismatch',
    () => {
      const grv = requireGrv();
      const f = expectThrow(() => grv(new Float64Array(4)), 'Float64Array');
      assert(errorName(f) === 'TypeMismatchError', `Float64Array name=${errorName(f)}`);
      const d = expectThrow(
        () => grv(new DataView(new ArrayBuffer(8)) as unknown as Uint8Array),
        'DataView'
      );
      assert(errorName(d) === 'TypeMismatchError', `DataView name=${errorName(d)}`);
      return 'Float64Array + DataView → TypeMismatchError';
    },
  ],
  [
    'grv-entropy',
    () => {
      // A stubbed or zeroing native fill reproduces the same bytes; a real
      // one never does, and no single value dominates a 256-byte draw.
      const grv = requireGrv();
      const a = grv(new Uint8Array(32));
      const b = grv(new Uint8Array(32));
      assert(!bytesEqual(a, b), 'two 32-byte draws were identical');
      const big = grv(new Uint8Array(256));
      const counts = new Map<number, number>();
      for (const v of big) counts.set(v, (counts.get(v) ?? 0) + 1);
      let max = 0;
      for (const n of counts.values()) if (n > max) max = n;
      assert(max <= 256 * 0.9, `one byte value dominates (${max}/256)`);
      return `draws differ, ${counts.size} distinct values in 256 bytes`;
    },
  ],
  [
    'random-uuid',
    () => {
      const uuid = G.crypto?.randomUUID;
      assert(typeof uuid === 'function', 'randomUUID missing');
      const a = uuid();
      const b = uuid();
      const v4 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      assert(v4.test(a), `not a v4 uuid: ${a}`);
      assert(v4.test(b), `not a v4 uuid: ${b}`);
      assert(a !== b, 'two calls returned the same uuid');
      return a;
    },
  ],

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
      const key = requireGrv()(new Uint8Array(32));
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

  // -- text -----------------------------------------------------------------

  [
    'text-encoder',
    () => {
      const Encoder = requireEncoder();
      const enc = new Encoder();
      const got = hex(enc.encode('aé€🎉'));
      assert(got === '61c3a9e282acf09f8e89', `encode('aé€🎉') = ${got}`);
      assert(enc.encoding === 'utf-8', `encoding=${enc.encoding}`);
      assert(typeof enc.encodeInto === 'function', 'encodeInto missing');
      return `encode('aé€🎉')=${got}, encoding=utf-8, encodeInto present`;
    },
  ],
  [
    'text-decoder-present',
    () => {
      assert(typeof G.TextDecoder === 'function', `typeof=${typeof G.TextDecoder}`);
      return 'typeof=function';
    },
  ],
  [
    'td-ctor-fatal',
    () => {
      // core/src/jwt.ts:5 and protocol/messages.ts:234, at module scope.
      const Decoder = requireDecoder();
      const strict = new Decoder('utf-8', { fatal: true });
      assert(strict.fatal === true, `fatal=${strict.fatal}`);
      assert(strict.encoding === 'utf-8', `encoding=${strict.encoding}`);
      assert(strict.ignoreBOM === false, `ignoreBOM=${strict.ignoreBOM}`);
      const dflt = new Decoder();
      assert(dflt.fatal === false && dflt.encoding === 'utf-8', 'defaults wrong');
      return `new TextDecoder('utf-8', {fatal:true}) ok, defaults fatal=false`;
    },
  ],
  [
    'td-roundtrip-astral',
    () => {
      const text = 'aé€🎉 你好';
      const back = new (requireDecoder())().decode(new (requireEncoder())().encode(text));
      assert(back === text, `got ${JSON.stringify(back)}`);
      assert(back.length === 8, `length ${back.length}, expected 8 code units`);
      return `${JSON.stringify(text)} round-trips (8 code units)`;
    },
  ],
  [
    'td-fatal-throws',
    () => {
      const strict = new (requireDecoder())('utf-8', { fatal: true });
      const cases: [string, Uint8Array][] = [
        ['ff fe', bytes(0xff, 0xfe)],
        ['ed a0 80 (surrogate)', bytes(0xed, 0xa0, 0x80)],
        ['c0 80 (overlong)', bytes(0xc0, 0x80)],
        ['f4 90 80 80 (>U+10FFFF)', bytes(0xf4, 0x90, 0x80, 0x80)],
        ['e2 82 (truncated)', bytes(0xe2, 0x82)],
      ];
      for (const [label, input] of cases) {
        const e = expectThrow(() => strict.decode(input), `decode(${label})`);
        assert(errorName(e) === 'TypeError', `${label} threw ${errorName(e)}`);
      }
      return `${cases.length} invalid inputs → TypeError`;
    },
  ],
  [
    'td-lossy',
    () => {
      // protocol/cells.ts:89 and protocol/merged.ts:57 decode lossily.
      const lossy = new (requireDecoder())('utf-8', { fatal: false });
      const cases: [Uint8Array, string][] = [
        [bytes(0x61, 0xff, 0x62), 'a�b'],
        [bytes(0xe2, 0x82), '�'],
        [bytes(0xf0, 0x9f, 0x98, 0x61), '�a'],
        [bytes(0xed, 0xa0, 0x80), '���'],
        [bytes(0xc0, 0x80), '��'],
      ];
      for (const [input, want] of cases) {
        const got = lossy.decode(input);
        assert(got === want, `${hex(input)} → ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
      }
      return `'a\\uFFFDb' + ${cases.length - 1} WHATWG maximal-subpart cases`;
    },
  ],
  [
    'td-bom',
    () => {
      const Decoder = requireDecoder();
      const withBom = bytes(0xef, 0xbb, 0xbf, 0x61);
      const stripped = new Decoder().decode(withBom);
      assert(stripped === 'a', `default kept BOM: ${JSON.stringify(stripped)}`);
      const kept = new Decoder('utf-8', { ignoreBOM: true }).decode(withBom);
      assert(kept === '﻿a', `ignoreBOM lost BOM: ${JSON.stringify(kept)}`);
      return 'stripped by default, kept with ignoreBOM';
    },
  ],
  [
    'td-inputs',
    () => {
      const dec = new (requireDecoder())();
      const enc = new (requireEncoder())();
      const ab = enc.encode('hello').buffer;
      assert(dec.decode(ab) === 'hello', 'ArrayBuffer input');
      const big = new Uint8Array(16);
      big.set(enc.encode('hello'), 5);
      assert(dec.decode(big.subarray(5, 10)) === 'hello', 'subarray view input');
      assert(dec.decode(new DataView(big.buffer, 5, 5)) === 'hello', 'DataView input');
      assert(dec.decode() === '', 'no-argument decode');
      assert(dec.decode(new Uint8Array(0)) === '', 'empty view');
      return 'ArrayBuffer, offset view, DataView, no argument';
    },
  ],
  [
    'td-label',
    () => {
      const Decoder = requireDecoder();
      assert(new Decoder('utf8').encoding === 'utf-8', "'utf8' alias");
      assert(new Decoder(' UTF-8 ').encoding === 'utf-8', "' UTF-8 ' normalises");
      const e = expectThrow(() => new Decoder('latin1'), "new TextDecoder('latin1')");
      assert(errorName(e) === 'RangeError', `latin1 threw ${errorName(e)}`);
      return "'utf8' → 'utf-8', 'latin1' → RangeError";
    },
  ],
  [
    'td-stream',
    () => {
      // Not used by the SDK; guards against `{stream:true}` being accepted
      // and silently mis-decoding a split sequence.
      const dec = new (requireDecoder())();
      const all = new (requireEncoder())().encode('🎉x');
      const first = dec.decode(all.subarray(0, 2), { stream: true });
      assert(first === '', `partial sequence emitted ${JSON.stringify(first)}`);
      const rest = dec.decode(all.subarray(2));
      assert(rest === '🎉x', `got ${JSON.stringify(rest)}`);
      return 'split 4-byte sequence reassembled across chunks';
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
      assert(ticks === settled, `setInterval kept firing after clearInterval (${ticks})`);
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
      assert(typeof sym === 'symbol', `typeof Symbol.asyncIterator=${typeof sym}`);
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
    'secure-storage-roundtrip',
    async () => {
      assert(typeof G.btoa === 'function', 'btoa missing');
      const key = 'rnw.probe';
      const first = G.btoa('\x01\x02\x03');
      await SecureStorage.setItem(key, first);
      const got = await SecureStorage.getItem(key);
      assert(got === first, `getItem=${got}, want ${first}`);
      assert(
        bytesEqual(base64ToBytesFallback(got), bytes(1, 2, 3)),
        'decoded bytes differ'
      );
      // Overwrite: exercises the errSecDuplicateItem → SecItemUpdate branch.
      const second = G.btoa('\x09\x08');
      await SecureStorage.setItem(key, second);
      const after = await SecureStorage.getItem(key);
      assert(after === second, `after overwrite getItem=${after}`);
      let rejectedCode = 'none';
      try {
        await SecureStorage.setItem(key, '!!!');
      } catch (e) {
        rejectedCode = (e as { code?: string }).code ?? errorMessage(e);
      }
      assert(rejectedCode !== 'none', 'invalid base64 was accepted');
      await SecureStorage.removeItem(key);
      const gone = await SecureStorage.getItem(key);
      assert(gone === null, `after removeItem getItem=${String(gone)}`);
      await SecureStorage.removeItem(key); // idempotent
      return `set/get/overwrite/remove ok, absent → null, bad base64 → ${rejectedCode}`;
    },
  ],
  [
    'secure-storage-persist',
    async () => {
      // Written only when absent; a relaunch reports `persisted`, a run after
      // uninstall + install reports whatever the OS does with the Keychain.
      const key = 'rnw.probe.persist';
      const existing = await SecureStorage.getItem(key);
      if (existing !== null) {
        const stored = new (requireDecoder())().decode(base64ToBytesFallback(existing));
        return `persisted (${stored})`;
      }
      const stamp = `first-seen ${new Date().toISOString()}`;
      const encoded = new (requireEncoder())().encode(stamp);
      await SecureStorage.setItem(key, bytesToBase64Fallback(encoded));
      return `fresh (${stamp})`;
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
      assert(typeof core.FireflyClient === 'function', 'FireflyClient export missing');
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
      assert(first.publicKey.length === 32, `publicKey length ${first.publicKey.length}`);
      assert(first.peerID.length === 43, `peerID length ${first.peerID.length}`);
      const again = await entry.loadOrCreateDeviceKey(store);
      assert(again.peerID === first.peerID, 'same store yielded a different peerID');
      const other = await entry.loadOrCreateDeviceKey(new entry.InMemorySecureStorage());
      assert(other.peerID !== first.peerID, 'fresh store reproduced the peerID');
      return `seed=32 pub=32 peerID=${first.peerID} (stable on the same store, distinct on a fresh one, ${coldMs}ms cold)`;
    },
  ],
  [
    'device-key-keychain',
    async () => {
      // The Stage 2 gate proper: loadOrCreateDeviceKey over the documented
      // Keychain adapter (DOC COPY above) — 32-byte seed → base64 → SecItem
      // → base64 → bytes → the same peerID. A relaunch reports `persisted`
      // with the peerID this launch created; `delete` yields a fresh peer.
      const entry = loadDriverEntry();
      const SEED_KEY = 'fireflydb.device.seed'; // core/src/keys.ts SEED_KEY
      const PREFIX = 'rnw.probe.';
      const store = scoped(new WatchSecureStorage(), PREFIX);
      const before = await SecureStorage.getItem(PREFIX + SEED_KEY);
      const t0 = Date.now();
      const first = await entry.loadOrCreateDeviceKey(store);
      const ms = Date.now() - t0;
      assert(first.seed.length === 32, `seed length ${first.seed.length}`);
      assert(first.peerID.length === 43, `peerID length ${first.peerID.length}`);
      const stored = await SecureStorage.getItem(PREFIX + SEED_KEY);
      assert(stored !== null, 'seed missing from the Keychain after loadOrCreateDeviceKey');
      assert(
        bytesEqual(base64ToBytesFallback(stored), first.seed),
        'Keychain bytes differ from the seed the SDK holds'
      );
      const again = await entry.loadOrCreateDeviceKey(store);
      assert(
        again.peerID === first.peerID,
        `re-load through the Keychain gave ${again.peerID}, want ${first.peerID}`
      );
      if (before !== null) {
        // Persisted from an earlier launch: the identity must be the one
        // those bytes derive to, not a silently regenerated seed.
        const previous = entry.deriveDeviceKey(base64ToBytesFallback(before)).peerID;
        assert(previous === first.peerID, `launch-to-launch peerID changed (${previous} → ${first.peerID})`);
      }
      // `delete` → a fresh peer, on a throwaway key so the persisted one
      // above survives for the next launch's comparison.
      const throwaway = scoped(new WatchSecureStorage(), `${PREFIX}tmp.`);
      const a = await entry.loadOrCreateDeviceKey(throwaway);
      await throwaway.delete(SEED_KEY);
      const b = await entry.loadOrCreateDeviceKey(throwaway);
      await throwaway.delete(SEED_KEY);
      assert(a.peerID !== b.peerID, 'delete did not yield a fresh peer');
      return `${before === null ? 'fresh' : 'persisted'} peerID=${first.peerID} (Keychain bytes == seed, re-load stable, delete → fresh peer, ${ms}ms)`;
    },
  ],
  [
    'client-init',
    async () => {
      // The other half of the Stage 2 gate: `createFireflyClient(...).init()`
      // offline, composed the way a consumer composes it (sweepy's
      // src/store/firefly/client.ts) — the driver's watch entry over an
      // app-owned op-sqlite handle, the Keychain adapter above (same scoped
      // seed as `device-key-keychain`, so it is the same peer), a developer
      // pubkey and one bundled signed migration. `init()` is
      // loadOrCreateDeviceKey → OpSqliteDriver.open (WAL + libfirefly loaded
      // onto the handle) → firefly_init → pin developer_pubkey (base64url
      // via btoa) → applyBundledMigrations (TextEncoder / DataView / BigInt
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
      assert(core.readEnvelopeSeq(envelope) === 1, 'fixture envelope does not decode to seq 1');
      const store = scoped(new WatchSecureStorage(), 'rnw.probe.');
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
        // The device key came from the Keychain adapter: the stored seed
        // derives to the client's peer.
        const stored = await SecureStorage.getItem('rnw.probe.fireflydb.device.seed');
        assert(stored !== null, 'device seed missing from the Keychain after init()');
        assert(
          entry.deriveDeviceKey(base64ToBytesFallback(stored)).peerID === peerID,
          'Keychain seed does not derive to client.peerID'
        );
        const pinned = await scalar<string>(
          probeDb,
          "SELECT value FROM _firefly_config WHERE key = 'developer_pubkey'",
          'value'
        );
        const expected = core.base64UrlEncode(developer.publicKey);
        assert(pinned === expected, `developer_pubkey pinned as ${String(pinned)}, want ${expected}`);
        const head = await scalar<number>(
          probeDb,
          'SELECT seq FROM _firefly_migration_chain ORDER BY seq DESC LIMIT 1',
          'seq'
        );
        assert(Number(head) === 1, `migration chain head = ${String(head)}, want 1`);
        const table = await scalar<string>(
          probeDb,
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${PROBE_TABLE}'`,
          'name'
        );
        assert(table === PROBE_TABLE, `migration SQL did not create ${PROBE_TABLE}`);
        await client.close();
        // A second client over the same handle (sign-out / sign-in swaps do
        // this): the pinned pubkey must agree, the chain head stays at 1
        // (no re-apply), the peer is the same.
        const again = make();
        await again.init();
        assert(again.peerID === peerID, `re-init changed the peer (${again.peerID})`);
        const headAgain = await scalar<number>(
          probeDb,
          'SELECT seq FROM _firefly_migration_chain ORDER BY seq DESC LIMIT 1',
          'seq'
        );
        assert(Number(headAgain) === 1, `chain head after re-init = ${String(headAgain)}`);
        await again.close();
        return `init() ok in ${ms}ms: peerID=${peerID} (Keychain seed agrees), developer_pubkey pinned, migration seq 1 applied (${PROBE_TABLE} created + tracked), re-init over the same handle idempotent`;
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

async function runChecks(push: (r: CheckResult) => void): Promise<{ pass: number; fail: number }> {
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
