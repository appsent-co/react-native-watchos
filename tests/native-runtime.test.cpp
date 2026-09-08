#include "RNWBufferRange.h"
#include <cassert>
#include <cmath>
#include <initializer_list>
#include <limits>

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
}
