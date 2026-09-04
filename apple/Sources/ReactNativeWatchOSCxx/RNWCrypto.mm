#import "RNWCrypto.h"

#import <Security/Security.h>

namespace jsi = facebook::jsi;

static const double kRNWFillRandomMaxBytes = 65536;

void rnwInstallCrypto(jsi::Runtime &rt) {
    auto fill = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_fillRandom"),
        /*paramCount=*/1,
        [](jsi::Runtime &innerRt,
           const jsi::Value &,
           const jsi::Value *args,
           size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isObject()) {
                throw jsi::JSError(innerRt,
                    "__RNW_fillRandom: expected an ArrayBufferView");
            }
            jsi::Object view = args[0].getObject(innerRt);
            jsi::Value bufVal = view.getProperty(innerRt, "buffer");
            if (!bufVal.isObject() ||
                !bufVal.getObject(innerRt).isArrayBuffer(innerRt)) {
                throw jsi::JSError(innerRt,
                    "__RNW_fillRandom: argument has no ArrayBuffer");
            }
            jsi::ArrayBuffer buf = bufVal.getObject(innerRt).getArrayBuffer(innerRt);
            jsi::Value offVal = view.getProperty(innerRt, "byteOffset");
            jsi::Value lenVal = view.getProperty(innerRt, "byteLength");
            if (!offVal.isNumber() || !lenVal.isNumber()) {
                throw jsi::JSError(innerRt,
                    "__RNW_fillRandom: argument has no byteOffset / byteLength");
            }
            double off = offVal.getNumber();
            double len = lenVal.getNumber();
            double size = static_cast<double>(buf.size(innerRt));
            if (off < 0 || len < 0 || off + len > size) {
                throw jsi::JSError(innerRt, "__RNW_fillRandom: view out of bounds");
            }
            if (len > kRNWFillRandomMaxBytes) {
                throw jsi::JSError(innerRt,
                    "__RNW_fillRandom: length exceeds 65536");
            }
            if (len > 0) {
                uint8_t *base = buf.data(innerRt) + static_cast<size_t>(off);
                OSStatus status = SecRandomCopyBytes(
                    kSecRandomDefault, static_cast<size_t>(len), base);
                if (status != errSecSuccess) {
                    throw jsi::JSError(innerRt,
                        "__RNW_fillRandom: SecRandomCopyBytes failed (OSStatus " +
                        std::to_string(static_cast<int>(status)) + ")");
                }
            }
            return jsi::Value(innerRt, view);
        });
    rt.global().setProperty(rt, "__RNW_fillRandom", fill);
}
