#include "RNWBufferRange.h"
#include "RNWUTF8Decoder.h"
#include <cassert>
#include <limits>
#include <string>

static std::u16string decode(RNWUTF8Decoder &decoder, const std::string &bytes, bool stream) {
    std::u16string result;
    assert(decoder.decode(reinterpret_cast<const uint8_t *>(bytes.data()), bytes.size(), stream, result));
    return result;
}

int main() {
    size_t offset, length;
    for (double invalid : {-1.0, 0.5, std::numeric_limits<double>::quiet_NaN(),
                            std::numeric_limits<double>::infinity(),
                            -std::numeric_limits<double>::infinity(),
                            std::ldexp(1.0, std::numeric_limits<size_t>::digits)}) {
        assert(!rnwBufferRange(invalid, 0, 8, offset, length));
        assert(!rnwBufferRange(0, invalid, 8, offset, length));
    }
    assert(rnwBufferRange(8, 0, 8, offset, length));
    assert(!rnwBufferRange(8, 1, 8, offset, length));
    assert(!rnwBufferRange(9, 0, 8, offset, length));
    assert(rnwBufferRange(2, 6, 8, offset, length) && offset == 2 && length == 6);

    RNWUTF8Decoder empty(false, false);
    std::u16string emptyOutput;
    assert(empty.decode(nullptr, 0, false, emptyOutput) && emptyOutput.empty());
    assert(decode(empty, std::string("a\0b", 3), false) == std::u16string(u"a\0b", 3));
    bool lengthRejected = false;
    try {
        empty.decode(nullptr, static_cast<size_t>(std::numeric_limits<int32_t>::max()) + 1,
                     false, emptyOutput);
    } catch (const std::length_error &) {
        lengthRejected = true;
    }
    assert(lengthRejected);

    const std::u16string replacement = u"\uFFFD";
    const std::string bom = "\xEF\xBB\xBF";
    const std::string valid = "a\xC2\xA2\xE2\x82\xAC\xF0\x9F\x98\x80z";
    for (size_t split = 0; split <= valid.size(); ++split) {
        RNWUTF8Decoder decoder(true, false);
        auto left = decode(decoder, valid.substr(0, split), true);
        auto right = decode(decoder, valid.substr(split), false);
        assert(left + right == u"a\u00A2\u20AC\U0001F600z");
    }
    for (const std::string &invalid : {std::string("\xE0\x80"), std::string("\xED\xA0"),
                                    std::string("\xF0\x80"), std::string("\xF4\x90")}) {
        for (size_t split = 0; split <= invalid.size(); ++split) {
            RNWUTF8Decoder lossy(false, false);
            auto result = decode(lossy, invalid.substr(0, split), true);
            result += decode(lossy, invalid.substr(split), true);
            assert(result == replacement + replacement);
            assert(decode(lossy, "", false).empty());
        }
        RNWUTF8Decoder fatal(true, false);
        std::u16string out;
        assert(!fatal.decode(reinterpret_cast<const uint8_t *>(invalid.data()), invalid.size(), true, out));
        assert(decode(fatal, bom + "ok", false) == u"ok");
    }
    // ICU's incomplete-tail macro needs signed indices for these short inputs.
    for (const std::string &invalid : {std::string("\x80"), std::string("\x80\x80")}) {
        RNWUTF8Decoder lossy(false, false);
        assert(decode(lossy, invalid, true) == (invalid.size() == 1 ? replacement : replacement + replacement));
        assert(decode(lossy, "", false).empty());
        RNWUTF8Decoder fatal(true, false);
        std::u16string out;
        assert(!fatal.decode(reinterpret_cast<const uint8_t *>(invalid.data()), invalid.size(), true, out));
    }
    RNWUTF8Decoder decoder(false, false);
    assert(decode(decoder, "\xE2\x82", true).empty());
    assert(decode(decoder, "A", true) == replacement + u"A");
    assert(decode(decoder, "\xF0\x9F", true).empty());
    assert(decode(decoder, "", false) == replacement);
    for (size_t split = 0; split <= bom.size(); ++split) {
        assert(decode(decoder, bom.substr(0, split), true).empty());
        assert(decode(decoder, bom.substr(split) + bom, false) == u"\uFEFF");
    }
    RNWUTF8Decoder ignore(false, true);
    assert(decode(ignore, bom, false) == u"\uFEFF");
    RNWUTF8Decoder fatal(true, false);
    assert(decode(fatal, "\xE2", true).empty());
    std::u16string out;
    assert(!fatal.decode(nullptr, 0, false, out));
    assert(decode(fatal, "ok", false) == u"ok");

    // A fatal streaming call discards its bytes, but not BOM state established
    // by an earlier successful call. A failing call cannot establish BOM state.
    RNWUTF8Decoder recovered(true, false);
    assert(decode(recovered, "A", true) == u"A");
    const uint8_t malformed[] = {0xFF};
    assert(!recovered.decode(malformed, sizeof(malformed), true, out));
    assert(out.empty());
    assert(decode(recovered, bom, true) == u"\uFEFF");
    assert(decode(recovered, "", false).empty());
    const uint8_t failedPrefix[] = {'A', 0xFF};
    assert(!recovered.decode(failedPrefix, sizeof(failedPrefix), true, out));
    assert(decode(recovered, bom, true).empty());
    assert(!recovered.decode(malformed, sizeof(malformed), false, out));
    assert(decode(recovered, bom, false).empty());

}
