#pragma once

#include <cmath>
#include <cstddef>
#include <limits>

// Validate before casting: non-finite/fractional JS numbers cannot be byte ranges.
inline bool rnwBufferRange(double offset, double length, size_t size,
                           size_t &byteOffset, size_t &byteLength) {
    const double sizeLimit = std::ldexp(1.0, std::numeric_limits<size_t>::digits);
    if (!std::isfinite(offset) || !std::isfinite(length) ||
        offset < 0 || length < 0 || std::trunc(offset) != offset ||
        std::trunc(length) != length || offset >= sizeLimit || length >= sizeLimit) {
        return false;
    }
    byteOffset = static_cast<size_t>(offset);
    byteLength = static_cast<size_t>(length);
    return byteOffset <= size && byteLength <= size - byteOffset;
}
