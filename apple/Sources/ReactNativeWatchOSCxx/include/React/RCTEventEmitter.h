// watchOS fork of `<React/RCTEventEmitter.h>`. Mirrors upstream RN's
// shape so a maintainer writes
//
//   @interface MyModule : RCTEventEmitter <NativeMySpec>
//
// unconditionally and the same source compiles on both slices. The
// implementation differs under the hood:
//
//   - iOS:   RN's real RCTEventEmitter (bridge → RCTDeviceEventEmitter
//            → NativeEventEmitter on the JS side).
//   - watch: this stub. There's no bridge, so `sendEventWithName:body:`
//            just posts `RNWEventEmitterFireEventNotification` carrying
//            the event name + payload. The Swift `ReactNativeWatchOSHost`
//            observes the notification and dispatches into JS via
//            `__RNW_EVENTS.dispatchEvent(name, payload)`, where the
//            JS-side `NativeEventEmitter` shim's name-keyed listener
//            map fans out to subscribers.
//
// Header layout matches upstream — this file lives at
// `Headers/React/RCTEventEmitter.h` inside the xcframework, so a
// maintainer's `#import <React/RCTEventEmitter.h>` resolves here on
// watchOS and to RN's pod on iOS. The two never coexist in the same
// translation unit (iOS host + watch extension are separate Xcode
// targets), so the shared name causes no collision.
//
// Methods that depend on RN's bridge (`startObserving`, `stopObserving`,
// `invalidate`, `bridge`/`moduleRegistry`/`viewRegistry_DEPRECATED`
// properties) are intentionally omitted — they'd need RN infrastructure
// that doesn't exist on watchOS. Cross-platform module bodies that don't
// touch them work identically; modules that do touch them would have
// platform-specific code anyway.

#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

/// Posted by `RCTEventEmitter sendEventWithName:body:` on watchOS.
/// `ReactNativeWatchOSHost` observes this and forwards into JS via
/// `fireEventByName:payload:`.
///
/// userInfo keys:
///   "eventName" -> NSString (the name passed to `sendEventWithName:body:`)
///   "payload"   -> id (JSON-encodable) or NSNull
FOUNDATION_EXTERN NSNotificationName const RNWEventEmitterFireEventNotification;

/// Abstract base class for TurboModules that emit events to JS.
/// Subclass it, conform to your codegen-emitted `Native<Foo>Spec`, and
/// call `[self sendEventWithName:body:]` to fire events. The JS-side
/// `NativeEventEmitter` (shimmed on watchOS) takes care of subscription.
@interface RCTEventEmitter : NSObject <RCTBridgeModule>

/// Override in your subclass to advertise the events you emit. Optional
/// on watchOS — the watch stub doesn't validate against this list. On
/// iOS, attempting to send an unlisted event logs a warning.
- (NSArray<NSString *> *)supportedEvents;

/// Send an event to JS.
- (void)sendEventWithName:(NSString *)name body:(nullable id)body;

/// Lifecycle hooks the JS-side `NativeEventEmitter` calls when listeners
/// are added/removed. No-ops in the watch stub — the notification bridge
/// is always wired regardless of listener count.
- (void)addListener:(NSString *)eventName;
- (void)removeListeners:(double)count;

@end

NS_ASSUME_NONNULL_END
