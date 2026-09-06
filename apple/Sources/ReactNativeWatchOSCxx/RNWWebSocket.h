// Private — not in the XCFramework Headers/ or modulemap. C++/ObjC++ glue;
// exposing to Swift would drag `jsi::Runtime &` across the bridge.

#import <Foundation/Foundation.h>

#import <jsi/jsi.h>

#include "RNWCallInvoker.h"

NS_ASSUME_NONNULL_BEGIN

/// Install a WHATWG `WebSocket` on `globalThis`, backed by
/// `NSURLSessionWebSocketTask`. Native is a thin transport (the private
/// `__RNW_ws_connect` factory); the DOM surface, plus React Native's
/// `(url, protocols, { headers })` form, is a JS shim evaluated at install
/// time. Binary frames arrive as `ArrayBuffer`. Full surface and deviations:
/// docs/docs/runtime-globals.md.
void rnwInstallWebSocket(facebook::jsi::Runtime &rt,
                         facebook::react::RNWJSQueue jsQueue);

NS_ASSUME_NONNULL_END
