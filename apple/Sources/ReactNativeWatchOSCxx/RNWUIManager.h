#import <Foundation/Foundation.h>
#import "ReactNativeWatchOSCxx/RNWShadowNode.h"

#import <ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

#include <memory>

NS_ASSUME_NONNULL_BEGIN

/// Install `__RNW_UI` on `globalThis`. Owns the C++ shadow-tree registry
/// driven by the JS reconciler. On `completeRoot`, deep-copies the mutable
/// tree into immutable snapshots and invokes `onCommit` on the main queue.
void rnwInstallUIManager(
    facebook::jsi::Runtime &rt,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker,
    void (^onCommit)(NSArray<RNWShadowNodeSnapshot *> *root));

NS_ASSUME_NONNULL_END
