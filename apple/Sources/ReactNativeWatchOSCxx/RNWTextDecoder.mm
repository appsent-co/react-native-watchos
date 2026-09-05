#import "RNWTextDecoder.h"

#include "RNWBufferRange.h"
#include "RNWUTF8Decoder.h"
#include "RNWTextDecoderScript.h"

namespace jsi = facebook::jsi;

void rnwInstallTextDecoder(jsi::Runtime &rt) {
    auto create = jsi::Function::createFromHostFunction(
        rt, jsi::PropNameID::forAscii(rt, "__RNW_createUtf8Decoder"), 2,
        [](jsi::Runtime &innerRt, const jsi::Value &, const jsi::Value *args,
           size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isBool() || !args[1].isBool()) {
                throw jsi::JSError(innerRt, "TextDecoder: expected (fatal, ignoreBOM)");
            }
            auto state = std::make_shared<RNWUTF8Decoder>(args[0].getBool(), args[1].getBool());
            return jsi::Function::createFromHostFunction(
                innerRt, jsi::PropNameID::forAscii(innerRt, "decode"), 4,
                [state](jsi::Runtime &decodeRt, const jsi::Value &, const jsi::Value *values,
                        size_t valueCount) -> jsi::Value {
                    if (valueCount < 4 || !values[0].isObject() ||
                        !values[0].getObject(decodeRt).isArrayBuffer(decodeRt) ||
                        !values[1].isNumber() || !values[2].isNumber() || !values[3].isBool()) {
                        throw jsi::JSError(decodeRt,
                            "TextDecoder: expected (ArrayBuffer, byteOffset, byteLength, stream)");
                    }
                    auto buffer = values[0].getObject(decodeRt).getArrayBuffer(decodeRt);
                    size_t offset, length;
                    if (!rnwBufferRange(values[1].getNumber(), values[2].getNumber(),
                                        buffer.size(decodeRt), offset, length)) {
                        throw jsi::JSError(decodeRt, "TextDecoder: range out of bounds");
                    }
                    std::u16string output;
                    // Avoid pointer arithmetic on an empty ArrayBuffer's null data.
                    const uint8_t *bytes = length ? buffer.data(decodeRt) + offset : nullptr;
                    if (!state->decode(bytes, length, values[3].getBool(), output)) {
                        return jsi::Value::null();
                    }
                    return jsi::String::createFromUtf16(decodeRt, output);
                });
        });
    rt.global().setProperty(rt, "__RNW_createUtf8Decoder", create);
    auto buffer = std::make_shared<jsi::StringBuffer>(std::string(kRNWTextDecoderScript));
    rt.evaluateJavaScript(buffer, "<rnw-textdecoder-shim>");
}
