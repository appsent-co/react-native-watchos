// watchOS fork of `<React/RCTEventEmitter.h>`. Compiled only into RNWHost;
// the iOS pod uses React-Core's real RCTEventEmitter.

#import "React/RCTEventEmitter.h"

NSNotificationName const RNWEventEmitterFireEventNotification =
    @"RNWEventEmitterFireEvent";

@implementation RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
    return @[];
}

+ (NSString *)moduleName {
    return NSStringFromClass(self);
}

- (void)sendEventWithName:(NSString *)name body:(id)body {
    [[NSNotificationCenter defaultCenter]
        postNotificationName:RNWEventEmitterFireEventNotification
                      object:nil
                    userInfo:@{
                        @"eventName": name,
                        @"payload": body ?: [NSNull null],
                    }];
}

- (void)addListener:(NSString *)eventName { (void)eventName; }
- (void)removeListeners:(double)count    { (void)count; }

@end
