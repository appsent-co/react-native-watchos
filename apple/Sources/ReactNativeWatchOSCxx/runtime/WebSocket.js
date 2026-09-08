// Browser-compatible events over the native JSI WebSocket transport.
// Bare Hermes has no Blob or DOM event classes; binary messages use ArrayBuffer.
(function () {
  'use strict';
  const CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3;
  // WHATWG: a CONNECTING or OPEN socket must not be garbage collected.
  const LIVE = new Set();
  let warnedBlob = false;

  // UTF-8 byte length of a string: 1-3 bytes per UTF-16 code unit, 4 for a
  // surrogate pair.
  function utf8ByteLength(str) {
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) bytes += 1;
      else if (c < 0x800) bytes += 2;
      else if (
        c >= 0xd800 &&
        c <= 0xdbff &&
        i + 1 < str.length &&
        (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00
      ) {
        bytes += 4;
        i++;
      } else bytes += 3;
    }
    return bytes;
  }

  function makeError(name, message) {
    const e = new Error(message);
    e.name = name;
    return e;
  }

  // RFC 6455 §4.1: a subprotocol is an RFC 2616 token.
  function isValidToken(value) {
    return (
      typeof value === 'string' && /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(value)
    );
  }

  function normalizeProtocols(protocols) {
    if (protocols === undefined || protocols === null) return [];
    const list =
      typeof protocols === 'string' ? [protocols] : Array.from(protocols);
    const seen = new Set();
    for (const protocol of list) {
      if (!isValidToken(protocol)) {
        throw makeError(
          'SyntaxError',
          "WebSocket: invalid subprotocol '" + String(protocol) + "'"
        );
      }
      if (seen.has(protocol)) {
        throw makeError(
          'SyntaxError',
          "WebSocket: duplicate subprotocol '" + protocol + "'"
        );
      }
      seen.add(protocol);
    }
    return list;
  }

  // Handshake fields URLSession fills in itself; a caller-supplied value is
  // dropped so a stray header cannot break the upgrade.
  const RESERVED_HEADERS = new Set([
    'connection',
    'content-length',
    'host',
    'upgrade',
    'sec-websocket-accept',
    'sec-websocket-extensions',
    'sec-websocket-key',
    'sec-websocket-protocol',
    'sec-websocket-version',
  ]);

  // React Native's third constructor argument, `{ headers }`, forwarded to
  // the upgrade request as a flat [name, value, …] list.
  function normalizeHeaders(options) {
    if (options === undefined || options === null) return [];
    if (typeof options !== 'object') {
      throw new TypeError('WebSocket: options must be an object');
    }
    const headers = options.headers;
    if (headers === undefined || headers === null) return [];
    if (typeof headers !== 'object') {
      throw new TypeError('WebSocket: options.headers must be an object');
    }
    const out = [];
    for (const name of Object.keys(headers)) {
      if (!isValidToken(name)) {
        throw makeError(
          'SyntaxError',
          "WebSocket: invalid header name '" + name + "'"
        );
      }
      let value = headers[name];
      if (value === undefined || value === null) continue;
      value = String(value);
      if (/[\r\n\0]/.test(value)) {
        throw makeError(
          'SyntaxError',
          "WebSocket: invalid value for header '" + name + "'"
        );
      }
      if (RESERVED_HEADERS.has(name.toLowerCase())) continue;
      out.push(name, value);
    }
    return out;
  }

  function report(err) {
    const g = globalThis;
    if (typeof g.reportError === 'function') {
      try {
        g.reportError(err);
        return;
      } catch (_) {
        // Fall back to the console if the host error reporter fails.
      }
    }
    if (g.console && typeof g.console.error === 'function') {
      g.console.error('WebSocket listener threw:', (err && err.stack) || err);
    }
  }

  function invoke(listener, ws, event) {
    try {
      if (typeof listener === 'function') listener.call(ws, event);
      else if (listener && typeof listener.handleEvent === 'function')
        listener.handleEvent(event);
    } catch (e) {
      report(e);
    }
  }

  // Attribute handlers and listeners run in registration order. `{once}` entries
  // are removed before they run and a listener removed mid-dispatch is skipped.
  function dispatch(ws, event) {
    event.target = ws;
    event.currentTarget = ws;
    event.timeStamp = Date.now();
    const list = ws._state.listeners[event.type];
    if (!list) return true;
    const snapshot = list.slice();
    for (const entry of snapshot) {
      if (entry.removed) continue;
      if (entry.once) {
        entry.removed = true;
        const at = list.indexOf(entry);
        if (at !== -1) list.splice(at, 1);
      }
      invoke(entry.listener, ws, event);
    }
    return true;
  }

  function WebSocket(url, protocols, options) {
    if (!(this instanceof WebSocket)) {
      throw new TypeError(
        "Class constructor WebSocket cannot be invoked without 'new'"
      );
    }
    const href = String(url);
    const list = normalizeProtocols(protocols);
    const headerList = normalizeHeaders(options);
    const state = {
      url: href,
      readyState: CONNECTING,
      protocol: '',
      extensions: '',
      binaryType: 'blob',
      listeners: Object.create(null),
      handlers: Object.create(null),
      native: null,
    };
    Object.defineProperty(this, '_state', { value: state });
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    const self = this;
    LIVE.add(this);
    try {
      state.native = globalThis.__RNW_ws_connect(href, list, headerList, {
        onOpen: function (protocol, extensions) {
          // A handshake can complete after close() during CONNECTING; WHATWG
          // says no `open` in that case.
          if (state.readyState !== CONNECTING) return;
          state.readyState = OPEN;
          state.protocol = protocol;
          state.extensions = extensions;
          dispatch(self, { type: 'open' });
        },
        onMessage: function (data) {
          if (state.readyState !== OPEN) return;
          if (
            typeof data !== 'string' &&
            state.binaryType === 'blob' &&
            !warnedBlob
          ) {
            warnedBlob = true;
            const c = globalThis.console;
            if (c && typeof c.warn === 'function') {
              c.warn(
                "WebSocket: binaryType 'blob' is unsupported on this runtime (no Blob); " +
                  "binary frames are delivered as ArrayBuffer. Set ws.binaryType = 'arraybuffer'."
              );
            }
          }
          dispatch(self, {
            type: 'message',
            data: data,
            origin: '',
            lastEventId: '',
            ports: [],
          });
        },
        onError: function (message) {
          state.readyState = CLOSED;
          dispatch(self, {
            type: 'error',
            message: message,
            error: makeError('Error', message),
          });
        },
        onClose: function (code, reason, wasClean) {
          state.readyState = CLOSED;
          LIVE.delete(self);
          dispatch(self, {
            type: 'close',
            code: code,
            reason: reason,
            wasClean: wasClean,
          });
          const native = state.native;
          state.native = null;
          if (native) native.dispose();
        },
      });
      state.url = state.native.url;
    } catch (e) {
      LIVE.delete(this);
      state.readyState = CLOSED;
      throw makeError('SyntaxError', (e && e.message) || String(e));
    }
  }

  const proto = WebSocket.prototype;

  function accessor(name, get, set) {
    Object.defineProperty(proto, name, {
      get: get,
      set: set,
      enumerable: true,
      configurable: true,
    });
  }
  accessor('url', function () {
    return this._state.url;
  });
  accessor('readyState', function () {
    return this._state.readyState;
  });
  accessor('protocol', function () {
    return this._state.protocol;
  });
  accessor('extensions', function () {
    return this._state.extensions;
  });
  accessor('bufferedAmount', function () {
    const n = this._state.native;
    return n ? n.bufferedAmount : 0;
  });
  accessor(
    'binaryType',
    function () {
      return this._state.binaryType;
    },
    function (v) {
      if (v === 'blob' || v === 'arraybuffer') this._state.binaryType = v;
    }
  );

  for (const type of ['open', 'message', 'error', 'close']) {
    accessor(
      'on' + type,
      function () {
        return this._state.handlers[type]?.listener ?? null;
      },
      function (listener) {
        const state = this._state;
        const previous = state.handlers[type];
        if (typeof listener !== 'function') {
          if (previous) {
            previous.removed = true;
            const list = state.listeners[type];
            list.splice(list.indexOf(previous), 1);
            delete state.handlers[type];
          }
        } else if (previous) {
          previous.listener = listener;
        } else {
          const entry = { listener, attribute: true, removed: false };
          state.handlers[type] = entry;
          (state.listeners[type] ||= []).push(entry);
        }
      }
    );
  }

  proto.addEventListener = function (type, listener, options) {
    if (listener === null || listener === undefined) return;
    const key = String(type);
    const lists = this._state.listeners;
    const list = lists[key] || (lists[key] = []);
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const once = !!(options && typeof options === 'object' && options.once);
    for (let i = 0; i < list.length; i++) {
      if (
        !list[i].attribute &&
        list[i].listener === listener &&
        list[i].capture === capture
      )
        return;
    }
    list.push({ listener, once, capture, removed: false });
  };

  proto.removeEventListener = function (type, listener, options) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const list = this._state.listeners[String(type)];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      if (
        !list[i].attribute &&
        list[i].listener === listener &&
        list[i].capture === capture
      ) {
        list[i].removed = true;
        list.splice(i, 1);
        return;
      }
    }
  };

  proto.dispatchEvent = function (event) {
    if (!event || typeof event.type !== 'string') {
      throw new TypeError(
        'WebSocket.dispatchEvent: event must have a string type'
      );
    }
    return dispatch(this, event);
  };

  proto.send = function (data) {
    const state = this._state;
    if (state.readyState === CONNECTING) {
      throw makeError(
        'InvalidStateError',
        'WebSocket.send: still in CONNECTING state'
      );
    }
    if (state.readyState !== OPEN || !state.native) return;
    let payload;
    if (typeof data === 'string' || data instanceof ArrayBuffer) {
      payload = data;
    } else if (ArrayBuffer.isView(data)) {
      payload =
        data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
          ? data.buffer
          : data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength
            );
    } else {
      payload = String(data);
    }
    state.native.send(payload);
  };

  proto.close = function (code, reason) {
    if (code !== undefined) {
      code = Number(code);
      if (
        !(
          Number.isInteger(code) &&
          (code === 1000 || (code >= 3000 && code <= 4999))
        )
      ) {
        throw makeError(
          'InvalidAccessError',
          'WebSocket.close: code must be 1000 or in the range 3000-4999, got ' +
            code
        );
      }
    }
    if (reason !== undefined) {
      reason = String(reason);
      if (utf8ByteLength(reason) > 123) {
        throw makeError(
          'SyntaxError',
          'WebSocket.close: reason must not exceed 123 UTF-8 bytes'
        );
      }
    }
    const state = this._state;
    if (state.readyState === CLOSING || state.readyState === CLOSED) return;
    state.readyState = CLOSING;
    if (state.native) {
      state.native.close(
        code === undefined ? 1000 : code,
        reason === undefined ? '' : reason
      );
    }
  };

  const constants = {
    CONNECTING: CONNECTING,
    OPEN: OPEN,
    CLOSING: CLOSING,
    CLOSED: CLOSED,
  };
  Object.keys(constants).forEach(function (k) {
    const desc = {
      value: constants[k],
      writable: false,
      enumerable: true,
      configurable: false,
    };
    Object.defineProperty(WebSocket, k, desc);
    Object.defineProperty(proto, k, desc);
  });
  Object.defineProperty(proto, Symbol.toStringTag, {
    value: 'WebSocket',
    configurable: true,
  });

  globalThis.WebSocket = WebSocket;
})();
