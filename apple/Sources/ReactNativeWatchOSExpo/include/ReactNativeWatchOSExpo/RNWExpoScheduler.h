#import <Foundation/Foundation.h>
#import <ReactNativeWatchOSCxx/RNWHermesHost.h>

NS_ASSUME_NONNULL_BEGIN

/// Owns the opaque scheduler context passed to Expo Modules JSI.
@interface RNWExpoScheduler : NSObject
- (instancetype)initWithSchedule:(RNWJavaScriptScheduler)schedule;
@property (nonatomic, readonly) void *handle;
+ (const void *)dispatchPointer;
@end

NS_ASSUME_NONNULL_END
