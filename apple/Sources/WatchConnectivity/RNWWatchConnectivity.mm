#import "RNWWatchConnectivity.h"

#import <WatchConnectivity/WatchConnectivity.h>

@interface RNWWatchConnectivity () <WCSessionDelegate>
@end

@implementation RNWWatchConnectivity {
    NSMutableDictionary<NSString *, void (^)(NSDictionary<NSString *, id> *)> *_pendingReplies;
    NSMutableDictionary<NSString *, void (^)(NSData *)> *_pendingDataReplies;
    dispatch_queue_t _stateQueue;
}

RCT_EXPORT_MODULE(WatchConnectivity)

- (instancetype)init
{
    if (self = [super init]) {
        _pendingReplies = [NSMutableDictionary new];
        _pendingDataReplies = [NSMutableDictionary new];
        // Serial queue gating mutable state accessed from both the JS
        // thread (method calls) and the WCSession delegate queue (OS
        // callbacks). dispatch_sync from either is safe.
        _stateQueue = dispatch_queue_create(
            "co.appsent.reactnativewatchos.wc-state",
            DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

#pragma mark - WCSession bootstrap

- (WCSession *)_session
{
    return WCSession.isSupported ? WCSession.defaultSession : nil;
}

- (NSString *)_activationStateName:(WCSessionActivationState)state
{
    switch (state) {
        case WCSessionActivationStateNotActivated: return @"notActivated";
        case WCSessionActivationStateInactive:     return @"inactive";
        case WCSessionActivationStateActivated:    return @"activated";
    }
    return @"notActivated";
}

- (NSDictionary *)_stateDictionary
{
    WCSession *s = [self _session];
    if (s == nil) {
        return @{
            @"activationState": @"notActivated",
            @"isReachable": @NO,
            @"isPaired": @NO,
            @"isWatchAppInstalled": @NO,
            @"isCompanionAppInstalled": @NO,
        };
    }
    return @{
        @"activationState": [self _activationStateName:s.activationState],
        @"isReachable": @(s.isReachable),
#if TARGET_OS_WATCH
        @"isPaired": @NO,
        @"isWatchAppInstalled": @NO,
        @"isCompanionAppInstalled": @(s.isCompanionAppInstalled),
#else
        @"isPaired": @(s.isPaired),
        @"isWatchAppInstalled": @(s.isWatchAppInstalled),
        @"isCompanionAppInstalled": @NO,
#endif
    };
}

#pragma mark - Spec methods

- (void)activate:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    if (s == nil) {
        reject(@"unsupported", @"WCSession is not supported on this device", nil);
        return;
    }
    s.delegate = self;
    if (s.activationState != WCSessionActivationStateActivated) {
        [s activateSession];
    }
    resolve([self _stateDictionary]);
}

- (void)getState:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
    resolve([self _stateDictionary]);
}

- (void)sendMessage:(NSDictionary *)message
        expectReply:(BOOL)expectReply
          timeoutMs:(double)timeoutMs
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    if (s == nil || s.activationState != WCSessionActivationStateActivated) {
        reject(@"not_activated", @"WCSession is not activated. Call activate() first.", nil);
        return;
    }
    if (!s.isReachable) {
        reject(@"not_reachable", @"Peer is not reachable. Use transferUserInfo or updateApplicationContext instead.", nil);
        return;
    }
    if (!expectReply) {
        [s sendMessage:message
          replyHandler:nil
          errorHandler:^(NSError *err) {
            reject(@"send_failed", err.localizedDescription, err);
        }];
        // Fire-and-forget resolves immediately once the OS accepts the
        // send — there's no acknowledgement protocol without a reply.
        resolve([NSNull null]);
        return;
    }
    __block BOOL settled = NO;
    void (^resolveOnce)(id) = ^(id value) {
        @synchronized (self) {
            if (settled) return;
            settled = YES;
        }
        resolve(value);
    };
    void (^rejectOnce)(NSString *, NSString *, NSError *) =
        ^(NSString *code, NSString *msg, NSError *err) {
        @synchronized (self) {
            if (settled) return;
            settled = YES;
        }
        reject(code, msg, err);
    };
    [s sendMessage:message
      replyHandler:^(NSDictionary<NSString *, id> *reply) {
        resolveOnce(reply ?: @{});
    }
      errorHandler:^(NSError *err) {
        rejectOnce(@"send_failed", err.localizedDescription, err);
    }];
    if (timeoutMs > 0) {
        dispatch_after(
            dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeoutMs * NSEC_PER_MSEC)),
            dispatch_get_main_queue(), ^{
            rejectOnce(@"timeout", @"sendMessage timed out waiting for reply", nil);
        });
    }
}

- (void)sendMessageData:(NSString *)base64
            expectReply:(BOOL)expectReply
              timeoutMs:(double)timeoutMs
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    if (s == nil || s.activationState != WCSessionActivationStateActivated) {
        reject(@"not_activated", @"WCSession is not activated. Call activate() first.", nil);
        return;
    }
    if (!s.isReachable) {
        reject(@"not_reachable", @"Peer is not reachable.", nil);
        return;
    }
    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0];
    if (data == nil) {
        reject(@"invalid_base64", @"sendMessageData payload was not valid base64", nil);
        return;
    }
    if (!expectReply) {
        [s sendMessageData:data
              replyHandler:nil
              errorHandler:^(NSError *err) {
            reject(@"send_failed", err.localizedDescription, err);
        }];
        resolve([NSNull null]);
        return;
    }
    __block BOOL settled = NO;
    void (^resolveOnce)(id) = ^(id value) {
        @synchronized (self) { if (settled) return; settled = YES; }
        resolve(value);
    };
    void (^rejectOnce)(NSString *, NSString *, NSError *) =
        ^(NSString *code, NSString *msg, NSError *err) {
        @synchronized (self) { if (settled) return; settled = YES; }
        reject(code, msg, err);
    };
    [s sendMessageData:data
          replyHandler:^(NSData *reply) {
        NSString *b64 = [reply base64EncodedStringWithOptions:0];
        resolveOnce(b64 ?: @"");
    }
          errorHandler:^(NSError *err) {
        rejectOnce(@"send_failed", err.localizedDescription, err);
    }];
    if (timeoutMs > 0) {
        dispatch_after(
            dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeoutMs * NSEC_PER_MSEC)),
            dispatch_get_main_queue(), ^{
            rejectOnce(@"timeout", @"sendMessageData timed out waiting for reply", nil);
        });
    }
}

- (void)replyToMessage:(NSString *)replyId payload:(NSDictionary *)payload
{
    __block void (^handler)(NSDictionary<NSString *, id> *) = nil;
    dispatch_sync(_stateQueue, ^{
        handler = self->_pendingReplies[replyId];
        [self->_pendingReplies removeObjectForKey:replyId];
    });
    if (handler) {
        handler(payload ?: @{});
    }
}

- (void)replyToMessageData:(NSString *)replyId base64:(NSString *)base64
{
    __block void (^handler)(NSData *) = nil;
    dispatch_sync(_stateQueue, ^{
        handler = self->_pendingDataReplies[replyId];
        [self->_pendingDataReplies removeObjectForKey:replyId];
    });
    if (handler) {
        NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0] ?: [NSData data];
        handler(data);
    }
}

- (void)updateApplicationContext:(NSDictionary *)context
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    if (s == nil || s.activationState != WCSessionActivationStateActivated) {
        reject(@"not_activated", @"WCSession is not activated.", nil);
        return;
    }
    NSError *err = nil;
    if (![s updateApplicationContext:(context ?: @{}) error:&err]) {
        reject(@"update_failed", err.localizedDescription ?: @"updateApplicationContext failed", err);
        return;
    }
    resolve([NSNull null]);
}

- (void)getApplicationContext:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    resolve(s.applicationContext ?: @{});
}

- (void)getReceivedApplicationContext:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    resolve(s.receivedApplicationContext ?: @{});
}

- (void)transferUserInfo:(NSDictionary *)info
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    if (s == nil || s.activationState != WCSessionActivationStateActivated) {
        reject(@"not_activated", @"WCSession is not activated.", nil);
        return;
    }
    WCSessionUserInfoTransfer *transfer = [s transferUserInfo:(info ?: @{})];
    // Apple uses object identity to track transfers — there's no public id.
    // Hash the pointer for a stable string id JS can compare across calls.
    NSString *transferId = [NSString stringWithFormat:@"%p", transfer];
    resolve(@{ @"id": transferId });
}

- (void)outstandingUserInfoTransfers:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject
{
    WCSession *s = [self _session];
    NSMutableArray *out = [NSMutableArray new];
    for (WCSessionUserInfoTransfer *t in s.outstandingUserInfoTransfers) {
        [out addObject:@{
            @"id": [NSString stringWithFormat:@"%p", t],
            @"userInfo": t.userInfo ?: @{},
        }];
    }
    resolve(out);
}

#pragma mark - WCSessionDelegate

- (void)session:(WCSession *)session
activationDidCompleteWithState:(WCSessionActivationState)activationState
          error:(NSError *)error
{
    [self sendEventWithName:@"stateChanged" body:[self _stateDictionary]];
}

- (void)sessionReachabilityDidChange:(WCSession *)session
{
    [self sendEventWithName:@"reachabilityChanged" body:@(session.isReachable)];
    [self sendEventWithName:@"stateChanged" body:[self _stateDictionary]];
}

#if !TARGET_OS_WATCH
- (void)sessionDidBecomeInactive:(WCSession *)session
{
    [self sendEventWithName:@"stateChanged" body:[self _stateDictionary]];
}

- (void)sessionDidDeactivate:(WCSession *)session
{
    // OS guidance: re-activate after deactivate so subsequent watch
    // pairings keep working.
    [session activateSession];
    [self sendEventWithName:@"stateChanged" body:[self _stateDictionary]];
}

- (void)sessionWatchStateDidChange:(WCSession *)session
{
    [self sendEventWithName:@"stateChanged" body:[self _stateDictionary]];
}
#endif

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *, id> *)message
{
    [self sendEventWithName:@"message" body:@{ @"content": message ?: @{} }];
}

- (void)session:(WCSession *)session
didReceiveMessage:(NSDictionary<NSString *, id> *)message
   replyHandler:(void (^)(NSDictionary<NSString *, id> *))replyHandler
{
    NSString *replyId = [[NSUUID UUID] UUIDString];
    dispatch_sync(_stateQueue, ^{
        self->_pendingReplies[replyId] = [replyHandler copy];
    });
    [self sendEventWithName:@"message" body:@{
        @"content": message ?: @{},
        @"replyId": replyId,
    }];
}

- (void)session:(WCSession *)session didReceiveMessageData:(NSData *)messageData
{
    NSString *b64 = [messageData base64EncodedStringWithOptions:0];
    [self sendEventWithName:@"messageData" body:@{ @"data": b64 ?: @"" }];
}

- (void)session:(WCSession *)session
didReceiveMessageData:(NSData *)messageData
   replyHandler:(void (^)(NSData *))replyHandler
{
    NSString *replyId = [[NSUUID UUID] UUIDString];
    dispatch_sync(_stateQueue, ^{
        self->_pendingDataReplies[replyId] = [replyHandler copy];
    });
    NSString *b64 = [messageData base64EncodedStringWithOptions:0];
    [self sendEventWithName:@"messageData" body:@{
        @"data": b64 ?: @"",
        @"replyId": replyId,
    }];
}

- (void)session:(WCSession *)session
didReceiveApplicationContext:(NSDictionary<NSString *, id> *)applicationContext
{
    [self sendEventWithName:@"applicationContext" body:applicationContext ?: @{}];
}

- (void)session:(WCSession *)session didReceiveUserInfo:(NSDictionary<NSString *, id> *)userInfo
{
    [self sendEventWithName:@"userInfo" body:userInfo ?: @{}];
}

#pragma mark - TurboModule wiring

- (std::shared_ptr<facebook::react::TurboModule>)
        getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeWatchConnectivitySpecJSI>(params);
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[
        @"message", @"messageData",
        @"applicationContext", @"userInfo",
        @"reachabilityChanged", @"stateChanged",
    ];
}

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end
