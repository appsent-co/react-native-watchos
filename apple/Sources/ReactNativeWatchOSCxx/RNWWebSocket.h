// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

#include "RNWCallInvoker.h"

NS_ASSUME_NONNULL_BEGIN

/// Install a minimal WHATWG-shaped `WebSocket` on `globalThis`, backed by
/// `NSURLSessionWebSocketTask`. Surface is what Metro's HMRClient calls:
/// `new WebSocket(url)`, `onopen`/`onmessage`/`onerror`/`onclose`,
/// `send(string)`, `close()`. Binary frames and `addEventListener` are not
/// implemented; `send(ArrayBuffer)` falls back to UTF-8 decoding.
void rnwInstallWebSocket(facebook::jsi::Runtime &rt,
                         facebook::react::RNWJSQueue jsQueue);

NS_ASSUME_NONNULL_END
