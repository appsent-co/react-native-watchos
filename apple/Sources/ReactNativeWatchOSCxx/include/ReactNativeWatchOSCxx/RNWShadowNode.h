#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Node kind in the snapshot tree. `view` covers every SwiftUI view, keyed
/// by `viewName`. `rawText` is the inert string child of a Text-like node.
typedef NS_ENUM(NSInteger, RNWNodeKind) {
    RNWNodeKindView,
    RNWNodeKindRawText,
};

/// Immutable snapshot of a shadow node. SwiftUI renders directly off this.
@interface RNWShadowNodeSnapshot : NSObject
@property (nonatomic, readonly) NSInteger tag;
@property (nonatomic, readonly) RNWNodeKind kind;

/// JS-side view type ("Text", "Button", "VStack", ...). nil for rawText.
@property (nonatomic, readonly, nullable) NSString *viewName;

/// Values are NSString | NSNumber | NSArray | NSDictionary; per-view-type
/// interpretation happens on the Swift side. nil for rawText.
@property (nonatomic, readonly, nullable) NSDictionary<NSString *, id> *props;

/// Modifiers in source order — SwiftUI modifiers are non-commutative.
/// Each entry has a "$type" key plus modifier-specific params.
@property (nonatomic, readonly) NSArray<NSDictionary<NSString *, id> *> *modifiers;

/// Event-name → JS handler id. Native dispatches via
/// `__RNW_EVENTS.dispatch(id, payload)`.
@property (nonatomic, readonly) NSDictionary<NSString *, NSNumber *> *eventHandlers;

/// rawText only.
@property (nonatomic, readonly, nullable) NSString *text;

@property (nonatomic, readonly) NSArray<RNWShadowNodeSnapshot *> *children;

- (instancetype)initWithTag:(NSInteger)tag
                       kind:(RNWNodeKind)kind
                   viewName:(nullable NSString *)viewName
                      props:(nullable NSDictionary<NSString *, id> *)props
                  modifiers:(NSArray<NSDictionary<NSString *, id> *> *)modifiers
              eventHandlers:(NSDictionary<NSString *, NSNumber *> *)eventHandlers
                       text:(nullable NSString *)text
                   children:(NSArray<RNWShadowNodeSnapshot *> *)children
    NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;
@end

NS_ASSUME_NONNULL_END
