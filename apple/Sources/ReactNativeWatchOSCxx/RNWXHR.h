// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

#include "RNWCallInvoker.h"

NS_ASSUME_NONNULL_BEGIN

/// Install a minimal WHATWG-shaped `XMLHttpRequest` on `globalThis`, backed
/// by `NSURLSessionDataTask` against a shared `NSURLSession`. Surface is
/// only what `whatwg-fetch` reads; must be installed before the JS bundle
/// that imports `whatwg-fetch` is evaluated.
///
/// Not implemented: `responseType = 'blob'` (no Blob in Hermes),
/// `withCredentials` (accepted as no-op), `onprogress`, `FormData`.
void rnwInstallXHR(facebook::jsi::Runtime &rt,
                   facebook::react::RNWJSQueue jsQueue);

NS_ASSUME_NONNULL_END
