// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

NS_ASSUME_NONNULL_BEGIN

/// Install a WHATWG `TextDecoder` (UTF-8 only) on `globalThis`, the
/// counterpart of the `TextEncoder` Hermes ships natively. Native is one
/// primitive, `__RNW_utf8Decode(buffer, byteOffset, byteLength, fatal)`,
/// returning the string or `null` when `fatal` is set and the input is not
/// valid UTF-8; the `TextDecoder` class itself is a JS shim evaluated at
/// install time, so it exists before any bundle runs. Surface and
/// deviations: docs/docs/runtime-globals.md.
void rnwInstallTextDecoder(facebook::jsi::Runtime &rt);

NS_ASSUME_NONNULL_END
