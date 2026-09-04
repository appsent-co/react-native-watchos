#import "RNWTextDecoder.h"

#include <string>

namespace jsi = facebook::jsi;

namespace {

// The WHATWG Encoding Standard's UTF-8 decoder (§ 11.1.1) in one pass. Valid
// input is never copied (`copied` stays false, so the caller builds the JS
// string straight from the input pointer). On a malformed sequence `fatal`
// returns false; otherwise the maximal subpart becomes U+FFFD and the valid
// runs around it are copied into `out`. Hand-written rather than CFString
// because CoreFoundation has no lossy mode.
bool rnwDecodeUtf8(const uint8_t *bytes, size_t len, bool fatal,
                   std::string &out, bool &copied) {
    static const char kReplacement[] = "\xEF\xBF\xBD";
    size_t i = 0;
    size_t validStart = 0;
    copied = false;

    auto replaceRange = [&](size_t from, size_t resumeAt) -> bool {
        if (fatal) return false;
        out.append(reinterpret_cast<const char *>(bytes + validStart), from - validStart);
        out.append(kReplacement, 3);
        validStart = resumeAt;
        copied = true;
        return true;
    };

    while (i < len) {
        uint8_t b = bytes[i];
        if (b < 0x80) {
            i++;
            continue;
        }
        size_t need;
        uint8_t lower = 0x80, upper = 0xBF;
        if (b >= 0xC2 && b <= 0xDF) {
            need = 1;
        } else if (b >= 0xE0 && b <= 0xEF) {
            need = 2;
            if (b == 0xE0) lower = 0xA0;       // no overlong 3-byte forms
            else if (b == 0xED) upper = 0x9F;  // no encoded surrogates
        } else if (b >= 0xF0 && b <= 0xF4) {
            need = 3;
            if (b == 0xF0) lower = 0x90;       // no overlong 4-byte forms
            else if (b == 0xF4) upper = 0x8F;  // nothing above U+10FFFF
        } else {
            // Stray continuation byte, C0/C1 overlong lead, or F5..FF.
            if (!replaceRange(i, i + 1)) return false;
            i++;
            continue;
        }
        size_t start = i;
        i++;
        size_t seen = 0;
        bool bad = false;
        while (seen < need) {
            if (i >= len) {  // truncated sequence at end of input
                bad = true;
                break;
            }
            uint8_t c = bytes[i];
            if (c < lower || c > upper) {  // out-of-range continuation:
                bad = true;                // do not consume it
                break;
            }
            lower = 0x80;
            upper = 0xBF;
            i++;
            seen++;
        }
        if (bad && !replaceRange(start, i)) return false;
    }
    if (copied) {
        out.append(reinterpret_cast<const char *>(bytes + validStart), len - validStart);
    }
    return true;
}

constexpr const char *kRNWTextDecoderShim = R"JS((function () {
  'use strict';
  var decodeUtf8 = globalThis.__RNW_utf8Decode;
  var UTF8_LABELS = {
    'unicode-1-1-utf-8': true, 'unicode11utf8': true, 'unicode20utf8': true,
    'utf-8': true, 'utf8': true, 'x-unicode20utf8': true,
  };

  function toBytes(input, method) {
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new TypeError(method + ': input must be an ArrayBuffer or an ArrayBufferView');
  }

  // Trailing bytes that start a sequence the next stream chunk may complete.
  function incompleteTail(u8) {
    var n = u8.length;
    for (var k = 1; k <= 3 && k <= n; k++) {
      var b = u8[n - k];
      if (b >= 0x80 && b <= 0xbf) continue; // continuation byte: look further back
      var need = b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 0;
      return need > k ? k : 0;
    }
    return 0;
  }

  function TextDecoder(label, options) {
    if (!(this instanceof TextDecoder)) {
      throw new TypeError("Class constructor TextDecoder cannot be invoked without 'new'");
    }
    var name = label === undefined ? 'utf-8' : String(label).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(UTF8_LABELS, name)) {
      throw new RangeError("TextDecoder: the encoding label '" + String(label) +
        "' is not supported (this runtime decodes utf-8 only)");
    }
    var opts = options === undefined || options === null ? {} : Object(options);
    Object.defineProperty(this, '_state', {
      value: {
        fatal: !!opts.fatal,
        ignoreBOM: !!opts.ignoreBOM,
        pending: null,
        bomSeen: false,
      },
    });
  }

  var proto = TextDecoder.prototype;

  function accessor(name, get) {
    Object.defineProperty(proto, name, { get: get, enumerable: true, configurable: true });
  }
  accessor('encoding', function () { return 'utf-8'; });
  accessor('fatal', function () { return this._state.fatal; });
  accessor('ignoreBOM', function () { return this._state.ignoreBOM; });

  proto.decode = function (input, options) {
    var state = this._state;
    var stream = !!(options && typeof options === 'object' && options.stream);
    var bytes = input === undefined ? new Uint8Array(0) : toBytes(input, 'TextDecoder.decode');
    if (state.pending !== null) {
      var joined = new Uint8Array(state.pending.length + bytes.length);
      joined.set(state.pending, 0);
      joined.set(bytes, state.pending.length);
      bytes = joined;
      state.pending = null;
    }
    var tail = stream ? incompleteTail(bytes) : 0;
    if (tail > 0) {
      state.pending = bytes.slice(bytes.length - tail);
      bytes = bytes.subarray(0, bytes.length - tail);
    }
    var skip = 0;
    if (!state.ignoreBOM && !state.bomSeen && bytes.length >= 3 &&
        bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      skip = 3;
    }
    if (bytes.length > 0) state.bomSeen = true;
    var text = decodeUtf8(bytes.buffer, bytes.byteOffset + skip, bytes.length - skip, state.fatal);
    if (text === null) {
      state.pending = null;
      state.bomSeen = false;
      throw new TypeError('TextDecoder.decode: the encoded data was not valid utf-8');
    }
    if (!stream) {
      state.pending = null;
      state.bomSeen = false;
    }
    return text;
  };

  Object.defineProperty(proto, Symbol.toStringTag, { value: 'TextDecoder', configurable: true });

  globalThis.TextDecoder = TextDecoder;
})();)JS";

} // namespace

void rnwInstallTextDecoder(jsi::Runtime &rt) {
    auto decode = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_utf8Decode"),
        /*paramCount=*/4,
        [](jsi::Runtime &innerRt,
           const jsi::Value &,
           const jsi::Value *args,
           size_t count) -> jsi::Value {
            if (count < 4 || !args[0].isObject() ||
                !args[0].getObject(innerRt).isArrayBuffer(innerRt) ||
                !args[1].isNumber() || !args[2].isNumber() || !args[3].isBool()) {
                throw jsi::JSError(innerRt,
                    "__RNW_utf8Decode: expected (ArrayBuffer, byteOffset, byteLength, fatal)");
            }
            jsi::ArrayBuffer buf = args[0].getObject(innerRt).getArrayBuffer(innerRt);
            double off = args[1].getNumber();
            double len = args[2].getNumber();
            double size = static_cast<double>(buf.size(innerRt));
            if (off < 0 || len < 0 || off + len > size) {
                throw jsi::JSError(innerRt, "__RNW_utf8Decode: range out of bounds");
            }
            if (len == 0) return jsi::String::createFromAscii(innerRt, "");
            const uint8_t *bytes = buf.data(innerRt) + static_cast<size_t>(off);
            std::string out;
            bool copied = false;
            if (!rnwDecodeUtf8(bytes, static_cast<size_t>(len), args[3].getBool(), out, copied)) {
                return jsi::Value::null();
            }
            if (copied) return jsi::String::createFromUtf8(innerRt, out);
            return jsi::String::createFromUtf8(innerRt, bytes, static_cast<size_t>(len));
        });
    rt.global().setProperty(rt, "__RNW_utf8Decode", decode);

    auto buffer = std::make_shared<jsi::StringBuffer>(std::string(kRNWTextDecoderShim));
    rt.evaluateJavaScript(buffer, "<rnw-textdecoder-shim>");
}
