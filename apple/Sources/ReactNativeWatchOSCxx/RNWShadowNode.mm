#import "ReactNativeWatchOSCxx/RNWShadowNode.h"

@implementation RNWShadowNodeSnapshot
- (instancetype)initWithTag:(NSInteger)tag
                       kind:(RNWNodeKind)kind
                   viewName:(NSString *)viewName
                      props:(NSDictionary<NSString *, id> *)props
                  modifiers:(NSArray<NSDictionary<NSString *, id> *> *)modifiers
              eventHandlers:(NSDictionary<NSString *, NSNumber *> *)eventHandlers
                       text:(NSString *)text
                   children:(NSArray<RNWShadowNodeSnapshot *> *)children {
    if ((self = [super init])) {
        _tag = tag;
        _kind = kind;
        _viewName = [viewName copy];
        _props = [props copy];
        _modifiers = [modifiers copy] ?: @[];
        _eventHandlers = [eventHandlers copy] ?: @{};
        _text = [text copy];
        _children = [children copy] ?: @[];
    }
    return self;
}
@end
