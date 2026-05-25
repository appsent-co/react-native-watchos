#import "NativeWatchInfo.h"

#import <WatchKit/WatchKit.h>

@implementation NativeWatchInfo

RCT_EXPORT_MODULE(WatchInfo)

- (NSString *)getModelName
{
    return [[WKInterfaceDevice currentDevice] model];
}

- (NSString *)getSystemName
{
    return [[WKInterfaceDevice currentDevice] systemName];
}

// The `RCTModuleProvider` selector that the registry calls to construct
// the C++ TurboModule wrapper. The `NativeWatchInfoSpecJSI` class is
// emitted by codegen from `example/src/specs/NativeWatchInfo.ts`; the
// `.mm` implementing its constructor + methodMap_ is compiled into the
// watch target by the `withWatchTurboModuleCodegen` plugin.
- (std::shared_ptr<facebook::react::TurboModule>)
        getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeWatchInfoSpecJSI>(params);
}

@end
