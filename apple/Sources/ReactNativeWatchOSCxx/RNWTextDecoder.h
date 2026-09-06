// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

NS_ASSUME_NONNULL_BEGIN

/// Install a WHATWG `TextDecoder` (UTF-8 only) on `globalThis`, the
/// counterpart of the `TextEncoder` Hermes ships natively. Native is one
/// factory, `__RNW_createUtf8Decoder(fatal, ignoreBOM)`, returning a native
/// decode function that owns UTF-8 streaming and BOM state. The decode function
/// returns a string or `null` on fatal malformed input. The class is JS evaluated at
/// install time, so it exists before any bundle runs. Surface and
/// deviations: docs/docs/runtime-globals.md.
void rnwInstallTextDecoder(facebook::jsi::Runtime &rt);

NS_ASSUME_NONNULL_END
