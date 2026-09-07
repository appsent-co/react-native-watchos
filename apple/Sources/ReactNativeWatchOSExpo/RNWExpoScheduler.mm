#import <ReactNativeWatchOSExpo/RNWExpoScheduler.h>

@implementation RNWExpoScheduler {
  RNWJavaScriptScheduler _schedule;
}

- (instancetype)initWithSchedule:(RNWJavaScriptScheduler)schedule {
  if ((self = [super init])) _schedule = [schedule copy];
  return self;
}

- (void *)handle { return (__bridge void *)self; }

- (void)enqueue:(dispatch_block_t)callback { _schedule(callback); }

// This is ExpoModulesJSI 57's actual RuntimeSchedulerDispatch ABI. ExpoRuntime
// retains this box; the scheduling closure owns only an invalidatable RNW queue.
static void RNWExpoDispatch(void *handle, int priority, dispatch_block_t callback) {
  (void)priority;
  [(__bridge RNWExpoScheduler *)handle enqueue:callback];
}

+ (const void *)dispatchPointer { return (const void *)&RNWExpoDispatch; }
@end
