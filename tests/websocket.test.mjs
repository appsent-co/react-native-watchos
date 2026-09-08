import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL(
    '../apple/Sources/ReactNativeWatchOSCxx/runtime/WebSocket.js',
    import.meta.url
  ),
  'utf8'
);

// Only the native transport is mocked. The production adapter runs unmodified.
function runtime() {
  const connections = [];
  const errors = [];
  const connect = (url, protocols, headers, handlers) => {
    const connection = {
      url: 'wss://example.com/',
      requestedUrl: url,
      protocols,
      headers,
      handlers,
      bufferedAmount: 0,
      sent: [],
      closed: [],
      disposed: false,
      send(data) {
        this.sent.push(data);
      },
      close(...args) {
        this.closed.push(args);
      },
      dispose() {
        this.disposed = true;
      },
    };
    connections.push(connection);
    return connection;
  };
  const context = vm.createContext({
    __RNW_ws_connect: connect,
    ArrayBuffer,
    reportError: (error) => errors.push(error),
  });
  vm.runInContext(source, context);
  return { WebSocket: context.WebSocket, connections, errors, connect };
}

test('exposes native canonical URLs and case-sensitive protocol offers', () => {
  const { WebSocket, connections } = runtime();
  const ws = new WebSocket('HTTPS://EXAMPLE.COM:443', ['chat', 'CHAT']);
  assert.equal(ws.url, 'wss://example.com/');
  assert.equal(connections[0].url, ws.url);
  assert.equal(connections[0].requestedUrl, 'HTTPS://EXAMPLE.COM:443');
  assert.deepEqual([...connections[0].protocols], ['chat', 'CHAT']);
  assert.throws(() => new WebSocket('wss://example.com', ['chat', 'chat']), {
    name: 'SyntaxError',
  });
  assert.throws(() => new WebSocket('wss://example.com', ['bad token']), {
    name: 'SyntaxError',
  });
});

test('headers preserve custom values while filtering handshake headers', () => {
  const { WebSocket, connections } = runtime();
  new WebSocket('wss://example.com', [], {
    headers: {
      'Authorization': 'Bearer token',
      'Host': 'other',
      'Sec-WebSocket-Key': 'bad',
    },
  });
  assert.deepEqual(
    [...connections[0].headers],
    ['Authorization', 'Bearer token']
  );
  assert.throws(
    () =>
      new WebSocket('wss://example.com', [], { headers: { X: 'one\r\ntwo' } }),
    { name: 'SyntaxError' }
  );
});

test('error handlers see CLOSED and close disposes despite listener exceptions', () => {
  const { WebSocket, connections, errors } = runtime();
  const ws = new WebSocket('wss://example.com');
  const events = [];
  ws.onerror = () => events.push(['error', ws.readyState]);
  ws.onclose = () => {
    events.push(['close', ws.readyState]);
    throw new Error('listener');
  };
  connections[0].handlers.onError('failed');
  connections[0].handlers.onClose(1006, '', false);
  assert.deepEqual(events, [
    ['error', WebSocket.CLOSED],
    ['close', WebSocket.CLOSED],
  ]);
  assert.equal(connections[0].disposed, true);
  assert.equal(errors.length, 1);
});

test('attribute handlers keep their registration slot across replacement', () => {
  const { WebSocket } = runtime();
  const ws = new WebSocket('wss://example.com');
  const events = [];
  ws.addEventListener('open', () => events.push('first'));
  ws.onopen = () => events.push('old');
  ws.addEventListener('open', () => events.push('last'));
  ws.onopen = () => events.push('replacement');
  ws.dispatchEvent({ type: 'open' });
  assert.deepEqual(events, ['first', 'replacement', 'last']);
  events.length = 0;
  ws.onopen = null;
  ws.onopen = () => events.push('new slot');
  ws.dispatchEvent({ type: 'open' });
  assert.deepEqual(events, ['first', 'last', 'new slot']);
});

test('once and removal apply during dispatch; additions wait until next event', () => {
  const { WebSocket } = runtime();
  const ws = new WebSocket('wss://example.com');
  const events = [];
  const removed = () => events.push('removed');
  const added = () => events.push('added');
  ws.addEventListener(
    'message',
    () => {
      events.push('once');
      ws.removeEventListener('message', removed);
      ws.addEventListener('message', added);
    },
    { once: true }
  );
  ws.addEventListener('message', removed);
  ws.dispatchEvent({ type: 'message' });
  assert.deepEqual(events, ['once']);
  ws.dispatchEvent({ type: 'message' });
  assert.deepEqual(events, ['once', 'added']);
});

test('listener capture identity does not remove an attribute handler', () => {
  const { WebSocket } = runtime();
  const ws = new WebSocket('wss://example.com');
  let calls = 0;
  const listener = () => calls++;
  ws.onopen = listener;
  ws.addEventListener('open', listener);
  ws.addEventListener('open', listener, true);
  ws.removeEventListener('open', listener);
  ws.dispatchEvent({ type: 'open' });
  assert.equal(calls, 2);
});

test('send slices typed array views and rejects sends before open', () => {
  const { WebSocket, connections } = runtime();
  const ws = new WebSocket('wss://example.com');
  assert.throws(() => ws.send('early'), { name: 'InvalidStateError' });
  connections[0].handlers.onOpen('chat', '');
  const bytes = new Uint8Array([9, 1, 2, 9]);
  ws.send(bytes.subarray(1, 3));
  assert.deepEqual([...new Uint8Array(connections[0].sent[0])], [1, 2]);
  assert.equal(ws.protocol, 'chat');
});

test('close uses encoded UTF-8 byte limits and ignores late handshake/messages', () => {
  const { WebSocket, connections } = runtime();
  const ws = new WebSocket('wss://example.com');
  assert.throws(() => ws.close(3000.5), { name: 'InvalidAccessError' });
  assert.throws(() => ws.close(1000, '😀'.repeat(31)), { name: 'SyntaxError' });
  ws.close(1000, '😀'.repeat(30) + 'abc');
  assert.equal(connections[0].closed[0][1], '😀'.repeat(30) + 'abc');
  let calls = 0;
  ws.onopen = ws.onmessage = () => calls++;
  connections[0].handlers.onOpen('', '');
  connections[0].handlers.onMessage('late');
  assert.equal(calls, 0);
  assert.equal(ws.readyState, WebSocket.CLOSING);
});
