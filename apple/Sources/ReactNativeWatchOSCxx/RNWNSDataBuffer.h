// Private — not in the XCFramework Headers/ or modulemap.

#pragma once

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

/// Owned mutable `jsi::ArrayBuffer` storage copied from `NSData`, retained for
/// as long as Hermes keeps the ArrayBuffer alive. Construct the
/// `jsi::ArrayBuffer` on the JS queue only.
class RNWNSDataBuffer : public facebook::jsi::MutableBuffer {
public:
    explicit RNWNSDataBuffer(NSData *data) : data_([data mutableCopy]) {}
    size_t size() const override { return data_.length; }
    uint8_t *data() override {
        return reinterpret_cast<uint8_t *>(data_.mutableBytes);
    }
private:
    NSMutableData *data_;
};
