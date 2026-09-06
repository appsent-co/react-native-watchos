#import "RNWNSDataBuffer.h"
#include <cassert>

int main() {
    @autoreleasepool {
        static const uint8_t original[] = {1, 2, 3};
        NSData *immutable = [NSData dataWithBytesNoCopy:const_cast<uint8_t *>(original)
                                              length:sizeof(original) freeWhenDone:NO];
        RNWNSDataBuffer buffer(immutable);
        assert(buffer.size() == 3);
        buffer.data()[1] = 9;
        assert(buffer.data()[1] == 9 && original[1] == 2);
        NSMutableData *source = [NSMutableData dataWithBytes:original length:sizeof(original)];
        RNWNSDataBuffer isolated(source);
        static_cast<uint8_t *>(source.mutableBytes)[0] = 7;
        assert(isolated.data()[0] == 1);
        [source setLength:0];
        assert(isolated.size() == 3 && isolated.data()[2] == 3);
        RNWNSDataBuffer empty([NSData data]);
        assert(empty.size() == 0);
    }
}
