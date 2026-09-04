// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

NS_ASSUME_NONNULL_BEGIN

/// Installs `globalThis.__RNW_fillRandom(view)`: fills an `ArrayBufferView`
/// in place from `SecRandomCopyBytes` and returns the same view. The Web
/// Crypto validation (`crypto.getRandomValues` / `crypto.randomUUID`) lives
/// in `src/setupCrypto.ts`.
void rnwInstallCrypto(facebook::jsi::Runtime &rt);

NS_ASSUME_NONNULL_END
