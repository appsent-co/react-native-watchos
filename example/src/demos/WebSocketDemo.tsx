import { useEffect, useState } from 'react';
import {
  Text,
  VStack,
  font,
  foregroundStyle,
} from '@appsent-co/react-native-watchos/renderer';

/// Conformance probe for `globalThis.WebSocket` on the watch runtime.
///
/// The acceptance criterion is not "a WebSocket exists" but "`@fireflydb/core`'s
/// `DomWsConn` / `awaitWsOpen`, its `RNWebSocketDriver` (the driver
/// `@fireflydb/op-sqlite-driver` composes by default — it carries the bearer
/// token in React Native's `{ headers }` constructor argument) and
/// `@fireflydb/web`'s `WebWebSocketDriver` run unchanged", so the checks
/// below are written against exactly the surface those files touch, and the
/// `sdk-*` checks run a verbatim copy of `DomWsConn` + `WsRecvQueue` +
/// `RNWebSocketDriver` (see `SDK COPY` below).
///
/// Drive it with the fixture server:
///
///   node scripts/ws-echo-server.js         # from example/, port 8099
///
/// Each check logs one greppable line:
///
///   [WebSocketDemo] PASS <name>: <detail>
///   [WebSocketDemo] FAIL <name>: <detail>
///   [WebSocketDemo] WARN <name>: <detail>   (network-dependent; not counted)
///   [WebSocketDemo] DONE pass=<n> fail=<m>
///
/// so a run is captured straight out of the Metro log.

const ECHO_PORT = 8099;

interface DevServerInfo {
  host: string;
}

/// Same host the bundle came from — 127.0.0.1 on the simulator, the Mac's
/// LAN IP on a physical watch — so the fixture needs no per-device config.
function echoHost(): string {
  const dev = (globalThis as { __RNW_DEV_SERVER?: DevServerInfo })
    .__RNW_DEV_SERVER;
  return dev?.host ?? '127.0.0.1';
}

function wsUrl(path: string): string {
  return `ws://${echoHost()}:${ECHO_PORT}${path}`;
}

// ---------------------------------------------------------------------------
// Structural shape of the global. Typed as what the SDK touches plus the
// legacy `on*` properties `src/devSupport` uses, all optional so the probe
// can report a missing member instead of throwing on it.
// ---------------------------------------------------------------------------

type WsEvent = {
  type?: string;
  data?: unknown;
  code?: number;
  reason?: string;
  wasClean?: boolean;
  message?: string;
};

type Listener = (ev: WsEvent) => void;

interface WsLike {
  url?: string;
  readyState: number;
  binaryType?: string;
  protocol?: string;
  extensions?: string;
  bufferedAmount?: number;
  send(data: unknown): void;
  close(code?: number, reason?: string): void;
  addEventListener?: (
    type: string,
    listener: Listener,
    options?: { once?: boolean }
  ) => void;
  removeEventListener?: (type: string, listener: Listener) => void;
  onopen?: Listener | null;
  onmessage?: Listener | null;
  onerror?: Listener | null;
  onclose?: Listener | null;
  CONNECTING?: number;
  OPEN?: number;
  CLOSING?: number;
  CLOSED?: number;
}

interface WsCtor {
  new (
    url: string,
    protocols?: string | string[],
    // React Native's third argument — forwarded to the upgrade request.
    options?: { headers?: Record<string, string> }
  ): WsLike;
  CONNECTING?: number;
  OPEN?: number;
  CLOSING?: number;
  CLOSED?: number;
}

const WS = (globalThis as { WebSocket?: WsCtor }).WebSocket;

/// Subscribes through `addEventListener` when the runtime has it and falls
/// back to the `on*` property otherwise, so the probe still produces data on
/// a runtime that fails the `event-target` check. Returns an unsubscribe.
function on(ws: WsLike, type: string, listener: Listener): () => void {
  if (typeof ws.addEventListener === 'function') {
    ws.addEventListener(type, listener);
    return () => ws.removeEventListener?.(type, listener);
  }
  const key = `on${type}` as 'onopen' | 'onmessage' | 'onerror' | 'onclose';
  const previous = ws[key];
  ws[key] = (ev: WsEvent) => {
    previous?.(ev);
    listener(ev);
  };
  return () => {
    ws[key] = previous ?? null;
  };
}

function usesEventTarget(): boolean {
  return typeof WS?.prototype?.addEventListener === 'function';
}

// ---------------------------------------------------------------------------
// SDK COPY — `@fireflydb/core` src/drivers/wsRecvQueue.ts + domWebsocket.ts,
// trimmed to the two classes the acceptance checks need. Kept verbatim on
// purpose: if these run, the real SDK runs.
// ---------------------------------------------------------------------------

class WsCloseError extends Error {
  constructor(
    public readonly code: number,
    public readonly reason: string
  ) {
    super(`websocket closed: code=${code} reason=${reason}`);
    this.name = 'WsCloseError';
  }
}

class WsRecvQueue {
  private readonly queue: Uint8Array[] = [];
  private waiter: ((value: IteratorResult<Uint8Array>) => void) | null = null;
  private rejecter: ((err: Error) => void) | null = null;
  private closed = false;
  private closeErr: Error | null = null;

  get isClosed(): boolean {
    return this.closed;
  }

  deliver(buf: Uint8Array): void {
    if (this.waiter) {
      const w = this.waiter;
      this.waiter = null;
      this.rejecter = null;
      w({ value: buf, done: false });
      return;
    }
    this.queue.push(buf);
  }

  finishClean(): void {
    this.closed = true;
    if (this.waiter) {
      const w = this.waiter;
      this.waiter = null;
      this.rejecter = null;
      w({ value: undefined, done: true });
    }
  }

  finishError(err: Error): void {
    this.closed = true;
    this.closeErr = err;
    if (this.rejecter) {
      const r = this.rejecter;
      this.waiter = null;
      this.rejecter = null;
      r(err);
    }
  }

  iterate(): AsyncIterableIterator<Uint8Array> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      next(): Promise<IteratorResult<Uint8Array>> {
        if (self.queue.length > 0) {
          return Promise.resolve({ value: self.queue.shift()!, done: false });
        }
        if (self.closed) {
          if (self.closeErr) return Promise.reject(self.closeErr);
          return Promise.resolve({ value: undefined, done: true });
        }
        return new Promise<IteratorResult<Uint8Array>>((resolve, reject) => {
          self.waiter = resolve;
          self.rejecter = reject;
        });
      },
      return(): Promise<IteratorResult<Uint8Array>> {
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  }
}

const WS_OPEN = 1;
const WS_CLOSED = 3;

class DomWsConn {
  private readonly rx = new WsRecvQueue();

  constructor(private readonly ws: WsLike) {
    ws.addEventListener!('message', (ev) => {
      const data = ev.data;
      if (data instanceof ArrayBuffer) {
        this.rx.deliver(new Uint8Array(data));
      } else if (data instanceof Uint8Array) {
        this.rx.deliver(data);
      }
    });
    ws.addEventListener!('close', (ev) => {
      const { code = 1005, reason = '' } = ev;
      if (code === 1000 || code === 1005) {
        this.rx.finishClean();
      } else {
        this.rx.finishError(new WsCloseError(code, reason));
      }
    });
    ws.addEventListener!('error', () => {
      if (!this.rx.isClosed) {
        this.rx.finishError(new Error('WebSocket error'));
      }
    });
  }

  async send(bytes: Uint8Array): Promise<void> {
    if (this.ws.readyState !== WS_OPEN) {
      throw new Error(
        `WebSocket is not open (readyState=${this.ws.readyState})`
      );
    }
    const ab =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes.buffer
        : bytes.slice().buffer;
    this.ws.send(ab);
  }

  recv(): AsyncIterableIterator<Uint8Array> {
    return this.rx.iterate();
  }

  async close(code?: number, reason?: string): Promise<void> {
    if (this.ws.readyState === WS_CLOSED) return;
    return new Promise<void>((resolve) => {
      const onClose = () => resolve();
      this.ws.addEventListener!('close', onClose, { once: true });
      try {
        this.ws.close(code ?? 1000, reason ?? '');
      } catch {
        this.ws.removeEventListener!('close', onClose);
        resolve();
      }
    });
  }
}

/// `@fireflydb/core`'s awaitWsOpen, verbatim.
function awaitWsOpen(ws: WsLike): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      ws.removeEventListener!('error', onErr);
      resolve();
    };
    const onErr = (ev: WsEvent) => {
      ws.removeEventListener!('open', onOpen);
      reject(new Error(ev.message || 'WebSocket error before open'));
    };
    ws.addEventListener!('open', onOpen, { once: true });
    ws.addEventListener!('error', onErr, { once: true });
  });
}

/// `@fireflydb/core` src/drivers/rnWebsocket.ts, verbatim: RN's global takes
/// `(url, protocols, { headers })`, and that is how the JWT rides the upgrade.
interface RNWebSocketCtor {
  new (
    url: string,
    protocols: string | string[] | undefined,
    options: { headers?: Record<string, string> }
  ): WsLike;
}

class RNWebSocketDriver {
  async connect(
    url: string,
    headers: Record<string, string>
  ): Promise<DomWsConn> {
    const ctor = (globalThis as { WebSocket?: unknown }).WebSocket as
      | RNWebSocketCtor
      | undefined;
    if (ctor === undefined) {
      throw new Error('RNWebSocketDriver: global WebSocket is unavailable');
    }
    const ws = new ctor(url, undefined, { headers });
    ws.binaryType = 'arraybuffer';
    await awaitWsOpen(ws);
    return new DomWsConn(ws);
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail: string;
}

/// Checks that need the public internet. A failure is reported as WARN and
/// left out of the pass/fail gate so an offline Mac doesn't fail the run.
const NETWORK_DEPENDENT = new Set(['tls-public']);

const timers = globalThis as unknown as {
  setTimeout: (cb: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => timers.setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = timers.setTimeout(
      () => reject(new Error(`timeout after ${ms}ms waiting for ${label}`)),
      ms
    );
    p.then(
      (v) => {
        timers.clearTimeout(id);
        resolve(v);
      },
      (e) => {
        timers.clearTimeout(id);
        reject(e);
      }
    );
  });
}

/// Opens a socket and resolves once it is OPEN. Uses `on()` rather than
/// `awaitWsOpen` so it works on a runtime with no event-target methods.
function connect(path: string, protocols?: string | string[]): Promise<WsLike> {
  return withTimeout(
    new Promise<WsLike>((resolve, reject) => {
      let ws: WsLike;
      try {
        ws = new WS!(wsUrl(path), protocols);
      } catch (e) {
        reject(e);
        return;
      }
      on(ws, 'open', () => resolve(ws));
      on(ws, 'error', (ev) =>
        reject(new Error(ev.message ?? 'error before open'))
      );
      on(ws, 'close', (ev) =>
        reject(new Error(`closed before open (code=${ev.code})`))
      );
    }),
    8000,
    `open ${path}`
  );
}

/// Every line goes to `console.log` (→ the Metro that served the bundle) and
/// into a transcript that `flushReport` POSTs to the fixture server in one
/// request at the end. Two channels because the console pipe only reaches the
/// Metro that served the bundle — a Release build, a physical watch, or a
/// restarted Metro loses it — and one request rather than one per line so the
/// probe's own traffic doesn't perturb the timing it is measuring.
const transcript: string[] = [];

function report(line: string): void {
  console.log(line);
  transcript.push(line);
}

function flushReport(): void {
  try {
    const xhr = new (
      globalThis as { XMLHttpRequest: new () => XMLHttpRequest }
    ).XMLHttpRequest();
    xhr.open('POST', `http://${echoHost()}:${ECHO_PORT}/log`);
    xhr.send(transcript.join('\n'));
  } catch {
    // best-effort: the fixture may not be running
  }
}

function hex(u8: Uint8Array, max = 8): string {
  return Array.from(u8.subarray(0, max))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/// `/headers` answers with one text frame: the JSON of the upgrade
/// request's headers as the server saw them (names lower-cased by Node).
function decodeHeadersFrame(data: unknown): Record<string, string> {
  if (typeof data !== 'string') {
    throw new Error(`headers frame is ${typeof data}, not string`);
  }
  return JSON.parse(data) as Record<string, string>;
}

/// Resolves with the first message event; the listener is attached before
/// the socket can open, so a frame the server sends on connect is not lost.
function firstMessage(ws: WsLike, label: string): Promise<WsEvent> {
  return withTimeout(
    new Promise<WsEvent>((resolve) => {
      const off = on(ws, 'message', (ev) => {
        off();
        resolve(ev);
      });
    }),
    8000,
    label
  );
}

/// One echo round-trip: send `payload`, resolve with the first message event.
function roundTrip(ws: WsLike, payload: unknown): Promise<WsEvent> {
  return withTimeout(
    new Promise<WsEvent>((resolve) => {
      const off = on(ws, 'message', (ev) => {
        off();
        resolve(ev);
      });
      ws.send(payload);
    }),
    15000,
    'echo'
  );
}

async function closeQuietly(ws: WsLike): Promise<void> {
  try {
    ws.close(1000, '');
  } catch {
    // best-effort
  }
  await sleep(20);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

type Check = () => Promise<string>;

/// Ordered so surface failures are reported before the network checks that
/// depend on them.
function buildChecks(): Array<[string, Check]> {
  return [
    [
      'ctor-exists',
      async () => {
        if (typeof WS !== 'function')
          throw new Error('no globalThis.WebSocket');
        return `typeof=${typeof WS}`;
      },
    ],
    [
      'ctor-constants',
      async () => {
        const got = [WS!.CONNECTING, WS!.OPEN, WS!.CLOSING, WS!.CLOSED];
        if (got.join(',') !== '0,1,2,3') {
          throw new Error(`WebSocket.{CONNECTING,OPEN,CLOSING,CLOSED}=${got}`);
        }
        return '0,1,2,3';
      },
    ],
    [
      'instance-constants',
      async () => {
        const ws = new WS!(wsUrl('/echo'));
        const got = [ws.CONNECTING, ws.OPEN, ws.CLOSING, ws.CLOSED];
        await closeQuietly(ws);
        if (got.join(',') !== '0,1,2,3') {
          throw new Error(`instance constants=${got}`);
        }
        return '0,1,2,3';
      },
    ],
    [
      'event-target',
      async () => {
        const ws = new WS!(wsUrl('/echo'));
        const add = typeof ws.addEventListener;
        const remove = typeof ws.removeEventListener;
        await closeQuietly(ws);
        if (add !== 'function' || remove !== 'function') {
          throw new Error(
            `addEventListener=${add} removeEventListener=${remove}`
          );
        }
        return 'addEventListener + removeEventListener present';
      },
    ],
    [
      'binaryType',
      async () => {
        const ws = new WS!(wsUrl('/echo'));
        const initial = ws.binaryType;
        ws.binaryType = 'arraybuffer';
        const after = ws.binaryType;
        await closeQuietly(ws);
        if (initial !== 'blob')
          throw new Error(`default binaryType=${initial}`);
        if (after !== 'arraybuffer') throw new Error(`readback=${after}`);
        return "default='blob', set/get 'arraybuffer'";
      },
    ],
    [
      'readback',
      async () => {
        const url = wsUrl('/echo');
        const ws = new WS!(url);
        const detail =
          `url=${JSON.stringify(ws.url)} protocol=${JSON.stringify(ws.protocol)} ` +
          `extensions=${typeof ws.extensions} bufferedAmount=${typeof ws.bufferedAmount}`;
        await closeQuietly(ws);
        if (ws.url !== url) throw new Error(detail);
        if (typeof ws.extensions !== 'string') throw new Error(detail);
        if (typeof ws.bufferedAmount !== 'number') throw new Error(detail);
        return detail;
      },
    ],
    [
      'readystate-connecting',
      async () => {
        const ws = new WS!(wsUrl('/echo'));
        const rs = ws.readyState;
        await closeQuietly(ws);
        if (rs !== 0) throw new Error(`readyState right after construct=${rs}`);
        return 'readyState=0';
      },
    ],
    [
      'open-event',
      async () => {
        const ws = await connect('/echo');
        const rs = ws.readyState;
        await closeQuietly(ws);
        if (rs !== 1) throw new Error(`readyState in open handler=${rs}`);
        return 'open fired, readyState=1';
      },
    ],
    [
      'subprotocol-echo',
      async () => {
        // The @fireflydb/web offer, echo entry first (relay + Envoy order).
        const offer = ['fireflydb', 'bearer.eyJhbGciOiJIUzI1NiJ9.e30.sig'];
        const ws = await connect('/echo', offer);
        const negotiated = ws.protocol;
        await closeQuietly(ws);
        if (negotiated !== 'fireflydb') {
          throw new Error(
            `ws.protocol=${JSON.stringify(negotiated)} (want 'fireflydb')`
          );
        }
        return "ws.protocol='fireflydb'";
      },
    ],
    [
      'subprotocol-string-arg',
      async () => {
        const ws = await connect('/echo', 'fireflydb');
        const negotiated = ws.protocol;
        await closeQuietly(ws);
        if (negotiated !== 'fireflydb') {
          throw new Error(`ws.protocol=${JSON.stringify(negotiated)}`);
        }
        return "protocols: string accepted, ws.protocol='fireflydb'";
      },
    ],
    [
      'no-subprotocol',
      async () => {
        const ws = await connect('/noproto');
        const negotiated = ws.protocol;
        await closeQuietly(ws);
        if (negotiated !== '') {
          throw new Error(
            `ws.protocol=${JSON.stringify(negotiated)} (want '')`
          );
        }
        return "server selected none, ws.protocol=''";
      },
    ],
    [
      'headers-forwarded',
      async () => {
        // React Native's third constructor argument. `Authorization` is the
        // one that matters (core/src/state/stream.ts runOnce sends exactly
        // `{ Authorization: 'Bearer <jwt>' }`); `Sec-WebSocket-Version` is
        // a handshake field the shim must drop — `ws` refuses anything but
        // 13, so a leak would fail the upgrade rather than pass silently.
        const token = 'eyJhbGciOiJIUzI1NiJ9.e30.sig';
        const ws = new WS!(wsUrl('/headers'), undefined, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Custom': 'hello',
            'Sec-WebSocket-Version': '7',
          },
        });
        const pending = firstMessage(ws, 'headers frame');
        await withTimeout(awaitWsOpen(ws), 8000, 'open with headers');
        const seen = decodeHeadersFrame((await pending).data);
        await closeQuietly(ws);
        const detail =
          `authorization=${JSON.stringify(seen.authorization)} x-custom=${JSON.stringify(seen['x-custom'])} ` +
          `sec-websocket-version=${JSON.stringify(seen['sec-websocket-version'])}`;
        if (seen.authorization !== `Bearer ${token}`) throw new Error(detail);
        if (seen['x-custom'] !== 'hello') throw new Error(detail);
        if (seen['sec-websocket-version'] !== '13') throw new Error(detail);
        return detail;
      },
    ],
    [
      'headers-with-protocols',
      async () => {
        // Both at once: the offer still goes out (as the header URLSession
        // builds from `protocols`) and the server's pick still comes back.
        const ws = new WS!(wsUrl('/headers'), ['fireflydb', 'bearer.x'], {
          headers: { Authorization: 'Bearer t' },
        });
        const pending = firstMessage(ws, 'headers frame');
        await withTimeout(awaitWsOpen(ws), 8000, 'open with both');
        const negotiated = ws.protocol;
        const seen = decodeHeadersFrame((await pending).data);
        await closeQuietly(ws);
        const detail = `ws.protocol=${JSON.stringify(negotiated)} offer=${JSON.stringify(seen['sec-websocket-protocol'])} authorization=${JSON.stringify(seen.authorization)}`;
        if (negotiated !== 'fireflydb') throw new Error(detail);
        // The offer list as the server parsed it, whitespace aside.
        const offer = (seen['sec-websocket-protocol'] ?? '')
          .split(',')
          .map((p) => p.trim());
        if (offer.join('|') !== 'fireflydb|bearer.x') throw new Error(detail);
        if (seen.authorization !== 'Bearer t') throw new Error(detail);
        return detail;
      },
    ],
    [
      'headers-invalid',
      async () => {
        // Header injection and a non-token name are refused up front.
        const errors: string[] = [];
        for (const headers of [
          { 'X-Bad': 'a\r\nInjected: yes' },
          { 'Bad Name': 'x' },
        ]) {
          try {
            const ws = new WS!(wsUrl('/headers'), undefined, { headers });
            await closeQuietly(ws);
            errors.push('no throw');
          } catch (e) {
            errors.push((e as Error).name);
          }
        }
        const detail = errors.join(',');
        if (detail !== 'SyntaxError,SyntaxError') throw new Error(detail);
        return `CRLF value + non-token name → ${detail}`;
      },
    ],
    [
      'text-echo',
      async () => {
        const ws = await connect('/echo');
        const ev = await roundTrip(ws, 'ping');
        await closeQuietly(ws);
        if (typeof ev.data !== 'string' || ev.data !== 'ping') {
          throw new Error(`data=${typeof ev.data} ${String(ev.data)}`);
        }
        return "data==='ping' (string)";
      },
    ],
    [
      'text-echo-nul',
      async () => {
        // U+0000 is a legal text-frame character. A receive path built on a
        // NUL-terminated C string silently cuts the frame short here.
        const ws = await connect('/echo');
        const sent = 'a\u0000b';
        const ev = await roundTrip(ws, sent);
        await closeQuietly(ws);
        if (typeof ev.data !== 'string' || ev.data !== sent) {
          throw new Error(
            `got ${JSON.stringify(ev.data)} (length ${String((ev.data as string)?.length)}), want "a\\u0000b" (length 3)`
          );
        }
        return 'embedded NUL survives (length 3)';
      },
    ],
    [
      'binary-echo-small',
      async () => {
        const ws = await connect('/echo');
        ws.binaryType = 'arraybuffer';
        const sent = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 255]);
        const ev = await roundTrip(ws, sent.buffer);
        await closeQuietly(ws);
        if (!(ev.data instanceof ArrayBuffer)) {
          throw new Error(
            `data is ${typeof ev.data} ${String((ev.data as object)?.constructor?.name)}, want ArrayBuffer`
          );
        }
        const got = new Uint8Array(ev.data);
        if (!bytesEqual(sent, got)) {
          throw new Error(`sent=${hex(sent)} got=${hex(got)}`);
        }
        return `ArrayBuffer(${got.length}) round-tripped byte-exact`;
      },
    ],
    [
      'binary-echo-view',
      async () => {
        const ws = await connect('/echo');
        ws.binaryType = 'arraybuffer';
        // A view that does not span its buffer — what a framed payload
        // looks like before DomWsConn.send slices it.
        const backing = new Uint8Array([9, 9, 1, 2, 3, 9, 9]);
        const view = backing.subarray(2, 5);
        const ev = await roundTrip(ws, view);
        await closeQuietly(ws);
        if (!(ev.data instanceof ArrayBuffer)) {
          throw new Error(`data is not ArrayBuffer (${typeof ev.data})`);
        }
        const got = new Uint8Array(ev.data);
        if (!bytesEqual(new Uint8Array([1, 2, 3]), got)) {
          throw new Error(`got=${hex(got)} len=${got.length}`);
        }
        return 'ArrayBufferView honours byteOffset/byteLength';
      },
    ],
    [
      'binary-echo-1mib',
      async () => {
        // The relay's default bootstrap chunk (1 MiB, config.go ChunkBytes)
        // plus the SDK's 5-byte frame header — the first size that exceeds
        // NSURLSessionWebSocketTask's default maximumMessageSize.
        const size = 1024 * 1024 + 5;
        const ws = await connect('/echo');
        ws.binaryType = 'arraybuffer';
        const sent = new Uint8Array(size);
        for (let i = 0; i < size; i += 997) sent[i] = i & 0xff;
        const ev = await roundTrip(ws, sent.buffer);
        await closeQuietly(ws);
        if (!(ev.data instanceof ArrayBuffer)) {
          throw new Error(`data is not ArrayBuffer (${typeof ev.data})`);
        }
        if (ev.data.byteLength !== size) {
          throw new Error(`got ${ev.data.byteLength} bytes, want ${size}`);
        }
        return `${size} B round-tripped`;
      },
    ],
    [
      'binary-echo-8mib',
      async () => {
        // DEFAULT_MAX_FRAME_BYTES in @fireflydb/core and the relay's
        // ws.max_frame_bytes default: the largest frame that can arrive.
        const size = 8 * 1024 * 1024;
        const ws = await connect('/echo');
        ws.binaryType = 'arraybuffer';
        const sent = new Uint8Array(size);
        sent[0] = 0xab;
        sent[size - 1] = 0xcd;
        const ev = await roundTrip(ws, sent.buffer);
        await closeQuietly(ws);
        if (!(ev.data instanceof ArrayBuffer)) {
          throw new Error(`data is not ArrayBuffer (${typeof ev.data})`);
        }
        const got = new Uint8Array(ev.data);
        if (got.length !== size || got[0] !== 0xab || got[size - 1] !== 0xcd) {
          throw new Error(
            `len=${got.length} first=${got[0]} last=${got[size - 1]}`
          );
        }
        return `${size} B round-tripped`;
      },
    ],
    [
      'close-clean',
      async () => {
        const ws = await connect('/echo');
        const seen = withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          'clean close'
        );
        ws.close(1000, 'bye');
        const closing = ws.readyState;
        const ev = await seen;
        const detail = `closing=${closing} code=${ev.code} reason=${JSON.stringify(ev.reason)} wasClean=${ev.wasClean} final=${ws.readyState}`;
        if (closing !== 2) throw new Error(detail);
        if (ev.code !== 1000) throw new Error(detail);
        if (ev.reason !== 'bye') throw new Error(detail);
        if (ev.wasClean !== true) throw new Error(detail);
        if (ws.readyState !== 3) throw new Error(detail);
        return detail;
      },
    ],
    [
      'close-1013',
      async () => {
        // WS_CLOSE_TRY_AGAIN_LATER — the relay's back-off signal.
        // URLSessionWebSocketTask has no CloseCode case for 1012–1014: it
        // reports 1005 and hands the raw close-frame payload (2-byte code +
        // reason) as the reason, which the shim decodes back. Without that,
        // DomWsConn would see 1005 — a clean EOF — and the SDK's
        // isTryAgainLater could never be true on the watch.
        const ws = await connect('/close1013');
        const ev = await withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          '1013 close'
        );
        const detail = `code=${ev.code} reason=${JSON.stringify(ev.reason)} wasClean=${ev.wasClean} (recovered from URLSession's raw-payload fallback)`;
        if (ev.code !== 1013) throw new Error(detail);
        if (ev.reason !== 'slow down') throw new Error(detail);
        if (ev.wasClean !== true) throw new Error(detail);
        return detail;
      },
    ],
    [
      'close-1012-1014',
      async () => {
        // The other two codes URLSession normalises, plus 1013 with no
        // reason (a 2-byte payload) and with a NUL inside the reason.
        const cases: [number, string][] = [
          [1012, 'restart'],
          [1014, 'bad gateway'],
          [1013, ''],
          [1013, 'a\u0000b'],
        ];
        const seen: string[] = [];
        for (const [code, reason] of cases) {
          const ws = await connect(
            `/close?code=${code}&reason=${encodeURIComponent(reason)}`
          );
          const ev = await withTimeout(
            new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
            8000,
            `${code} close`
          );
          seen.push(`${ev.code}:${JSON.stringify(ev.reason)}`);
          if (
            ev.code !== code ||
            ev.reason !== reason ||
            ev.wasClean !== true
          ) {
            throw new Error(
              `sent ${code} ${JSON.stringify(reason)}, got code=${ev.code} reason=${JSON.stringify(ev.reason)} wasClean=${ev.wasClean}`
            );
          }
        }
        return seen.join(' ');
      },
    ],
    [
      'close-1011-reason',
      async () => {
        // A code inside URLSession's CloseCode enum arrives with its reason
        // through the ordinary path (no recovery involved).
        const ws = await connect('/close?code=1011&reason=oops');
        const ev = await withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          '1011 close'
        );
        const detail = `code=${ev.code} reason=${JSON.stringify(ev.reason)} wasClean=${ev.wasClean}`;
        if (ev.code !== 1011) throw new Error(detail);
        if (ev.reason !== 'oops') throw new Error(detail);
        if (ev.wasClean !== true) throw new Error(detail);
        return detail;
      },
    ],
    [
      'close-1006-drop',
      async () => {
        // TCP dropped with no close frame. A close event MUST still fire,
        // otherwise the SDK's recv() iterator hangs forever instead of
        // reconnecting.
        const ws = await connect('/drop');
        let errored = false;
        on(ws, 'error', () => {
          errored = true;
        });
        const ev = await withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          'unclean close'
        );
        const detail = `code=${ev.code} wasClean=${ev.wasClean} errorFired=${errored} final=${ws.readyState}`;
        if (ev.code !== 1006) throw new Error(detail);
        if (ev.wasClean !== false) throw new Error(detail);
        if (ws.readyState !== 3) throw new Error(detail);
        return detail;
      },
    ],
    [
      'error-before-open',
      async () => {
        // A 401 on the upgrade — what an expired JWT looks like. awaitWsOpen
        // rejects on the error event, so the event must carry `message`.
        const ws = new WS!(wsUrl('/reject'));
        const ev = await withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'error', resolve)),
          8000,
          'error before open'
        );
        await sleep(50);
        const detail = `message=${JSON.stringify(ev.message)} readyState=${ws.readyState}`;
        if (typeof ev.message !== 'string' || ev.message.length === 0) {
          throw new Error(detail);
        }
        return detail;
      },
    ],
    [
      'close-follows-error',
      async () => {
        // Same failure, checked from the other side: a socket that errors
        // must also close, or `DomWsConn`'s consumer never learns.
        const ws = new WS!(wsUrl('/reject'));
        const ev = await withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          'close after failed handshake'
        );
        return `code=${ev.code} wasClean=${ev.wasClean}`;
      },
    ],
    [
      'on-props',
      async () => {
        // src/devSupport's HMR client uses only these — the rewrite must not
        // break Fast Refresh.
        const ws = new WS!(wsUrl('/echo'));
        const order: string[] = [];
        const done = new Promise<void>((resolve) => {
          ws.onopen = () => {
            order.push('open');
            ws.send('x');
          };
          ws.onmessage = (ev) => {
            order.push(`message:${String(ev.data)}`);
            ws.close();
          };
          ws.onclose = () => {
            order.push('close');
            resolve();
          };
        });
        await withTimeout(done, 8000, 'on* handlers');
        const detail = order.join(' → ');
        if (detail !== 'open → message:x → close') throw new Error(detail);
        return detail;
      },
    ],
    [
      'listener-remove',
      async () => {
        const ws = await connect('/echo');
        let removedCalls = 0;
        let onceCalls = 0;
        const removed = () => {
          removedCalls++;
        };
        ws.addEventListener!('message', removed);
        ws.removeEventListener!('message', removed);
        ws.addEventListener!(
          'message',
          () => {
            onceCalls++;
          },
          { once: true }
        );
        await roundTrip(ws, 'a');
        await roundTrip(ws, 'b');
        await closeQuietly(ws);
        const detail = `removed=${removedCalls} once=${onceCalls}`;
        if (removedCalls !== 0 || onceCalls !== 1) throw new Error(detail);
        return detail;
      },
    ],
    [
      'microtask-drain',
      async () => {
        // The delivery path must drain Hermes' microtask queue after the
        // handler returns (RNWJSQueue.runOnJS, not runAsync). Without it a
        // promise resolved inside a message handler only continues on the
        // next timer tick, which is exactly how DomWsConn feeds recv().
        const ws = await connect('/echo');
        const order: string[] = [];
        const done = new Promise<void>((resolve) => {
          const off = on(ws, 'message', () => {
            off();
            order.push('event');
            Promise.resolve().then(() => order.push('micro'));
            timers.setTimeout(() => {
              order.push('timer');
              resolve();
            }, 0);
          });
          ws.send('m');
        });
        await withTimeout(done, 8000, 'microtask ordering');
        await sleep(50);
        await closeQuietly(ws);
        const detail = order.join(',');
        if (detail !== 'event,micro,timer') {
          throw new Error(`${detail} (want event,micro,timer)`);
        }
        return detail;
      },
    ],
    [
      'sdk-domwsconn',
      async () => {
        // The acceptance check: the SDK's own DomWsConn + awaitWsOpen, on a
        // socket built the way WebWebSocketDriver builds one.
        const offer = ['fireflydb', 'bearer.eyJhbGciOiJIUzI1NiJ9.e30.sig'];
        const ws = new WS!(wsUrl('/echo'), offer);
        ws.binaryType = 'arraybuffer';
        await withTimeout(awaitWsOpen(ws), 8000, 'awaitWsOpen');
        const conn = new DomWsConn(ws);
        const it = conn.recv();
        const payload = new Uint8Array([1, 5, 0, 0, 0, 42]); // a plausible frame
        await conn.send(payload);
        const first = await withTimeout(it.next(), 8000, 'recv()');
        if (first.done || !bytesEqual(payload, first.value)) {
          throw new Error(
            `recv gave done=${first.done} ${first.value && hex(first.value)}`
          );
        }
        await conn.close(1000, '');
        const end = await withTimeout(it.next(), 8000, 'recv() end');
        if (!end.done) throw new Error('iterator did not end on clean close');
        return `protocol=${JSON.stringify(ws.protocol)} recv 1 frame, clean EOF`;
      },
    ],
    [
      'sdk-rnwebsocketdriver',
      async () => {
        // The default driver on the watch entry: RNWebSocketDriver.connect
        // with the exact header StreamTask.runOnce sends, then the first
        // frame through DomWsConn.recv(). The frame is the server's view of
        // the upgrade request, so a dropped header cannot pass.
        const token = 'eyJhbGciOiJIUzI1NiJ9.e30.sig';
        const conn = await withTimeout(
          new RNWebSocketDriver().connect(wsUrl('/headers'), {
            Authorization: `Bearer ${token}`,
          }),
          8000,
          'RNWebSocketDriver.connect'
        );
        const it = conn.recv();
        const first = await withTimeout(it.next(), 8000, 'recv()');
        if (first.done)
          throw new Error('recv() ended before the headers frame');
        const seen = decodeHeadersFrame(
          first.value.buffer.slice(
            first.value.byteOffset,
            first.value.byteOffset + first.value.byteLength
          )
        );
        await conn.close(1000, '');
        const detail = `authorization=${JSON.stringify(seen.authorization)} (frame via DomWsConn.recv)`;
        if (seen.authorization !== `Bearer ${token}`) throw new Error(detail);
        return detail;
      },
    ],
    [
      'sdk-wsCloseError',
      async () => {
        // The relay's real back-off close, through the SDK's own DomWsConn:
        // recv() must reject with WsCloseError(1013, 'slow down') — exactly
        // what `isTryAgainLater` tests in core/src/state/stream.ts — rather
        // than end cleanly.
        const ws = new WS!(wsUrl('/close1013'));
        ws.binaryType = 'arraybuffer';
        await withTimeout(awaitWsOpen(ws), 8000, 'awaitWsOpen');
        const conn = new DomWsConn(ws);
        const it = conn.recv();
        try {
          await withTimeout(it.next(), 8000, 'recv() rejection');
        } catch (e) {
          if (
            e instanceof WsCloseError &&
            e.code === 1013 &&
            e.reason === 'slow down'
          ) {
            return `WsCloseError code=${e.code} reason=${JSON.stringify(e.reason)} (isTryAgainLater would be true)`;
          }
          throw new Error(
            `threw ${(e as Error).name}: ${(e as Error).message}`
          );
        }
        throw new Error('recv() resolved instead of throwing WsCloseError');
      },
    ],
    [
      'sdk-backoff-4013',
      async () => {
        // An application-range close (3000–4999) takes the ordinary path
        // and also reaches the SDK as WsCloseError with its reason.
        const ws = new WS!(wsUrl('/close?code=4013&reason=slow%20down'));
        ws.binaryType = 'arraybuffer';
        await withTimeout(awaitWsOpen(ws), 8000, 'awaitWsOpen');
        const conn = new DomWsConn(ws);
        const it = conn.recv();
        try {
          await withTimeout(it.next(), 8000, 'recv() rejection');
        } catch (e) {
          if (
            e instanceof WsCloseError &&
            e.code === 4013 &&
            e.reason === 'slow down'
          ) {
            return `WsCloseError code=${e.code} reason=${JSON.stringify(e.reason)}`;
          }
          throw new Error(
            `threw ${(e as Error).name}: ${(e as Error).message}`
          );
        }
        throw new Error('recv() resolved instead of throwing WsCloseError');
      },
    ],
    [
      'tls-public',
      async () => {
        // Network-dependent (WARN, not FAIL, when unreachable): a TLS
        // handshake through URLSession against a public echo service — the
        // shape of the relay's wss:// endpoint. The service greets with a
        // "Request served by …" text frame before echoing, so wait for our
        // own payload rather than the first message.
        const ws = new WS!('wss://echo.websocket.org/');
        await withTimeout(awaitWsOpen(ws), 15000, 'wss open');
        const payload = `watch-${Date.now()}`;
        await withTimeout(
          new Promise<void>((resolve) => {
            const off = on(ws, 'message', (ev) => {
              if (ev.data === payload) {
                off();
                resolve();
              }
            });
            ws.send(payload);
          }),
          15000,
          'wss echo'
        );
        const closed = withTimeout(
          new Promise<WsEvent>((resolve) => on(ws, 'close', resolve)),
          8000,
          'wss close'
        );
        ws.close(1000, 'done');
        const ev = await closed;
        const detail = `text echoed over TLS, close code=${ev.code} wasClean=${ev.wasClean}`;
        if (ev.code !== 1000 || ev.wasClean !== true) throw new Error(detail);
        return detail;
      },
    ],
    [
      'runtime-native-arraybuffer',
      async () => {
        // The exact JSI mechanism a binary frame will use: RNWXHR builds its
        // `responseType='arraybuffer'` response as a jsi::ArrayBuffer over a
        // jsi::MutableBuffer wrapping NSData (RNWXHR.mm's RNWNSDataBuffer).
        // If that reaches JS as a real ArrayBuffer, so will a WS frame.
        const body = 'ws-echo-server\n';
        const xhr = new (
          globalThis as { XMLHttpRequest: new () => XMLHttpRequest }
        ).XMLHttpRequest();
        xhr.open('GET', `http://${echoHost()}:${ECHO_PORT}/`);
        xhr.responseType = 'arraybuffer';
        xhr.send();
        // Polled rather than awaited on `onload`: until the WebSocket/XHR
        // dispatch path drains microtasks, a promise resolved from a native
        // callback only continues on the next timer tick, and `sleep` is that
        // tick. Keeps this check meaningful before and after the rewrite.
        for (let i = 0; i < 80 && xhr.readyState !== 4; i++) await sleep(100);
        if (xhr.readyState !== 4) throw new Error('xhr did not complete in 8s');
        const ab = xhr.response as unknown;
        if (!(ab instanceof ArrayBuffer)) {
          throw new Error(`response is ${typeof ab}, not ArrayBuffer`);
        }
        const got = new Uint8Array(ab);
        const want = new Uint8Array(body.length);
        for (let i = 0; i < body.length; i++) want[i] = body.charCodeAt(i);
        if (!bytesEqual(want, got)) {
          throw new Error(`len=${got.length} first=${hex(got)}`);
        }
        return `ArrayBuffer(${got.length}) from native, Blob=${typeof (globalThis as { Blob?: unknown }).Blob}`;
      },
    ],
    [
      'runtime-queueMicrotask',
      async () => {
        const q = (globalThis as { queueMicrotask?: unknown }).queueMicrotask;
        if (typeof q !== 'function') throw new Error('missing');
        return 'present';
      },
    ],
    [
      'runtime-bigint64',
      async () => {
        // Plan gap G13: the SDK's key blobs and merged-row decoder need
        // DataView BigInt accessors on this Hermes build.
        const view = new DataView(new ArrayBuffer(8));
        if (typeof view.setBigInt64 !== 'function') {
          throw new Error('DataView.setBigInt64 missing');
        }
        view.setBigInt64(0, -9007199254740993n, true);
        const back = view.getBigInt64(0, true);
        if (back !== -9007199254740993n) throw new Error(`readback=${back}`);
        if (BigInt.asIntN(64, 1n << 63n) !== -(1n << 63n)) {
          throw new Error('BigInt.asIntN wrong');
        }
        return 'get/setBigInt64 + BigInt.asIntN ok';
      },
    ],
  ];
}

interface Summary {
  pass: number;
  fail: number;
  warn: number;
  skip: number;
}

async function runChecks(push: (r: CheckResult) => void): Promise<Summary> {
  const s: Summary = { pass: 0, fail: 0, warn: 0, skip: 0 };
  const haveCtor = typeof WS === 'function';
  report(
    `[WebSocketDemo] START url=${wsUrl('/echo')} eventTargetOnPrototype=${usesEventTarget()}`
  );
  for (const [name, check] of buildChecks()) {
    if (!haveCtor && name !== 'ctor-exists') {
      s.skip++;
      push({ name, status: 'SKIP', detail: 'no WebSocket' });
      report(`[WebSocketDemo] SKIP ${name}: no WebSocket`);
      continue;
    }
    try {
      const detail = await check();
      s.pass++;
      push({ name, status: 'PASS', detail });
      report(`[WebSocketDemo] PASS ${name}: ${detail}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      if (NETWORK_DEPENDENT.has(name)) {
        s.warn++;
        push({ name, status: 'WARN', detail });
        report(`[WebSocketDemo] WARN ${name}: ${detail}`);
      } else {
        s.fail++;
        push({ name, status: 'FAIL', detail });
        report(`[WebSocketDemo] FAIL ${name}: ${detail}`);
      }
    }
  }
  report(`[WebSocketDemo] DONE pass=${s.pass} fail=${s.fail}`);
  if (s.warn > 0 || s.skip > 0) {
    report(
      `[WebSocketDemo] NOTE warn=${s.warn} skip=${s.skip} (not counted in DONE)`
    );
  }
  flushReport();
  return s;
}

export function WebSocketDemo() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    runChecks((r) => {
      if (live) setResults((prev) => [...prev, r]);
    })
      .then((s) => {
        if (live) {
          setSummary(
            `pass ${s.pass} · fail ${s.fail}` +
              (s.warn > 0 ? ` · warn ${s.warn}` : '') +
              (s.skip > 0 ? ` · skip ${s.skip}` : '')
          );
        }
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        report(`[WebSocketDemo] ABORTED: ${message}`);
        flushReport();
        if (live) setSummary(`aborted: ${message}`);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ style: 'headline' })]}>WebSocket</Text>
      <Text
        modifiers={[foregroundStyle('secondary'), font({ style: 'caption2' })]}
      >
        {wsUrl('/echo')}
      </Text>
      {results.map((r) => (
        <Text
          key={r.name}
          modifiers={[
            font({ style: 'caption2' }),
            foregroundStyle(
              r.status === 'PASS'
                ? 'green'
                : r.status === 'FAIL'
                  ? 'red'
                  : r.status === 'WARN'
                    ? 'orange'
                    : 'secondary'
            ),
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
