#pragma once

#include <unicode/utf8.h>
#include <unicode/ustring.h>

#include <cstddef>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <string>

// ICU performs UTF-8 conversion and identifies incomplete tails. This wrapper
// owns only streaming, BOM and fatal/replacement policy.
class RNWUTF8Decoder {
public:
    RNWUTF8Decoder(bool fatal, bool ignoreBOM) : fatal_(fatal), ignoreBOM_(ignoreBOM) {}

    bool decode(const uint8_t *bytes, size_t size, bool stream, std::u16string &out) {
        out.clear();
        if (size > static_cast<size_t>(std::numeric_limits<int32_t>::max()) - pending_.size()) {
            throw std::length_error("TextDecoder input exceeds supported length");
        }
        std::string joined;
        if (!pending_.empty()) {
            joined = pending_;
            if (size != 0) joined.append(reinterpret_cast<const char *>(bytes), size);
            bytes = reinterpret_cast<const uint8_t *>(joined.data());
            size = joined.size();
        }
        // Signed indices are essential: ICU checks length - 2 and length - 3.
        int32_t length = static_cast<int32_t>(size);
        if (stream) U8_TRUNCATE_IF_INCOMPLETE(bytes, 0, length);
        if (static_cast<size_t>(length) < size) {
            pending_.assign(reinterpret_cast<const char *>(bytes + length), size - length);
        } else {
            pending_.clear();
        }

        if (length != 0) {
            // UTF-16 never needs more code units than the UTF-8 byte count,
            // including one replacement per malformed maximal subpart.
            out.resize(length);
            int32_t written = 0;
            UErrorCode status = U_ZERO_ERROR;
            u_strFromUTF8WithSub(reinterpret_cast<UChar *>(out.data()), length,
                                &written, reinterpret_cast<const char *>(bytes), length,
                                fatal_ ? U_SENTINEL : 0xFFFD, nullptr, &status);
            if (U_FAILURE(status)) {
                pending_.clear();
                if (!stream) reset();
                out.clear();
                return false;
            }
            out.resize(written);
            if (!bomSeen_ && !ignoreBOM_ && !out.empty() && out.front() == 0xFEFF) {
                out.erase(0, 1);
            }
            bomSeen_ = true;
        }
        if (!stream) reset();
        return true;
    }

private:
    void reset() {
        pending_.clear();
        bomSeen_ = false;
    }
    bool fatal_;
    bool ignoreBOM_;
    bool bomSeen_ = false;
    std::string pending_;
};
