(function () {
  'use strict';
  var createDecoder = globalThis.__RNW_createUtf8Decoder;
  var UTF8_LABELS = {
    'unicode-1-1-utf-8': true,
    'unicode11utf8': true,
    'unicode20utf8': true,
    'utf-8': true,
    'utf8': true,
    'x-unicode20utf8': true,
  };

  function toBytes(input, method) {
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new TypeError(
      method + ': input must be an ArrayBuffer or an ArrayBufferView'
    );
  }

  function TextDecoder(label, options) {
    if (!(this instanceof TextDecoder)) {
      throw new TypeError(
        "Class constructor TextDecoder cannot be invoked without 'new'"
      );
    }
    var name =
      label === undefined ? 'utf-8' : String(label).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(UTF8_LABELS, name)) {
      throw new RangeError(
        "TextDecoder: the encoding label '" +
          String(label) +
          "' is not supported (this runtime decodes utf-8 only)"
      );
    }
    var opts = options === undefined || options === null ? {} : Object(options);
    Object.defineProperty(this, '_state', {
      value: {
        fatal: !!opts.fatal,
        ignoreBOM: !!opts.ignoreBOM,
        decode: createDecoder(!!opts.fatal, !!opts.ignoreBOM),
      },
    });
  }

  var proto = TextDecoder.prototype;

  function accessor(name, get) {
    Object.defineProperty(proto, name, {
      get: get,
      enumerable: true,
      configurable: true,
    });
  }
  accessor('encoding', function () {
    return 'utf-8';
  });
  accessor('fatal', function () {
    return this._state.fatal;
  });
  accessor('ignoreBOM', function () {
    return this._state.ignoreBOM;
  });

  proto.decode = function (input, options) {
    var state = this._state;
    var stream = !!(options && typeof options === 'object' && options.stream);
    var bytes =
      input === undefined
        ? new Uint8Array(0)
        : toBytes(input, 'TextDecoder.decode');
    var text = state.decode(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
      stream
    );
    if (text === null) {
      throw new TypeError(
        'TextDecoder.decode: the encoded data was not valid utf-8'
      );
    }
    return text;
  };

  Object.defineProperty(proto, Symbol.toStringTag, {
    value: 'TextDecoder',
    configurable: true,
  });

  globalThis.TextDecoder = TextDecoder;
})();
