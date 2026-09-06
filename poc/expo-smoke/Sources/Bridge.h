#import <Foundation/Foundation.h>
#import <ReactNativeWatchOSCxx/RNWHermesHost.h>

@interface RNWExpoScheduler : NSObject
- (instancetype _Nonnull)initWithSchedule:(RNWJavaScriptScheduler _Nonnull)schedule;
@property (nonatomic, readonly) void * _Nonnull handle;
+ (const void * _Nonnull)dispatchPointer;
@end
