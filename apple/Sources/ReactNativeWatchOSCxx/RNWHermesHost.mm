#import "ReactNativeWatchOSCxx/RNWHermesHost.h"
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h"
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry+Cxx.h"
#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <ReactCommon/RCTTurboModule.h>
#import "RNWCallInvoker.h"
#import "RNWNativeModules.h"
#import "RNWUIManager.h"
#import "RNWWebSocket.h"
#import "RNWXHR.h"

// Private SPI on `RCTBridge`, implemented in `RCTBridgeCompat.mm`.
@interface RCTBridge (RNWInternal)
+ (void)_rnwSetCurrentBridge:(nullable RCTBridge *)bridge;
- (void)_rnwSetRuntime:(nullable void *)runtime
         jsCallInvoker:(std::shared_ptr<facebook::react::CallInvoker>)invoker;
@end

#import <hermes/hermes.h>
#import <jsi/jsi.h>

#include <ReactCommon/TurboModule.h>
#include <ReactCommon/TurboModuleBinding.h>

#include <cstdint>
#include <memory>
#include <string>
#include <unordered_map>

// Hermes declares both `::hermes` and `::facebook::hermes` — a blanket
// `using namespace facebook;` makes `hermes` ambiguous.
namespace jsi = facebook::jsi;
namespace fbhermes = facebook::hermes;

namespace {

// Identity key for `dispatch_queue_set_specific`. GCD compares by pointer.
char kRNWJSQueueKeyByte = 0;
void* const kRNWJSQueueKey = &kRNWJSQueueKeyByte;

// Zero-copy read-only jsi::Buffer over an NSData. Hermes reads its bytes
// during evaluateJavaScript; the NSData retain keeps the storage alive
// for the duration of the call (and for the lifetime of any cached
// bytecode region Hermes may keep referencing).
class RNWNSDataReadBuffer : public jsi::Buffer {
public:
    explicit RNWNSDataReadBuffer(NSData *data) : data_(data) {}
    size_t size() const override { return data_.length; }
    const uint8_t *data() const override {
        return reinterpret_cast<const uint8_t *>(data_.bytes);
    }
private:
    NSData *data_;
};

} // namespace

@implementation RNWHermesHost {
    std::shared_ptr<jsi::Runtime> _runtime;
    // Serial queue that owns the runtime. Every `_runtime` access must
    // happen here. Tagged with `kRNWJSQueueKey` so `dispatch_get_specific`
    // can answer "am I on the JS queue?".
    dispatch_queue_t _jsQueue;
    facebook::react::RNWJSQueue _jsQueueRef;
    std::unordered_map<uint64_t, std::shared_ptr<jsi::Function>> _timers;
    // Interval-only: setTimeout uses one-shot dispatch_after.
    std::unordered_map<uint64_t, dispatch_source_t> _intervalSources;
    uint64_t _nextTimerId;
    std::shared_ptr<facebook::react::CallInvoker> _jsCallInvoker;
    std::shared_ptr<facebook::react::NativeMethodCallInvoker> _nativeMethodCallInvoker;
}

- (instancetype)init {
    if ((self = [super init])) {
        _jsQueue = dispatch_queue_create(
            "com.appsent.reactnativewatchos.js",
            DISPATCH_QUEUE_SERIAL);
        dispatch_queue_set_specific(_jsQueue, kRNWJSQueueKey, kRNWJSQueueKey, NULL);
        _jsQueueRef = facebook::react::RNWJSQueue{_jsQueue, kRNWJSQueueKey};
        _nextTimerId = 1;

        // Construct and install on the JS queue so the "runtime touched only
        // from the JS queue" invariant holds from the very first JSI call.
        dispatch_sync(_jsQueue, ^{
            // Microtask queue is required: without it `queueMicrotask` is
            // absent, React's scheduler falls through to `setImmediate` (also
            // absent), and Promise continuations may silently never fire.
            // Every native→JS hop must drain afterwards — that's centralized
            // in `RNWJSQueue::runOnJS*` / `invokeOnJS`; never
            // `dispatch_async(_jsQueue, ...)` a block that touches the runtime.
            auto runtimeConfig =
                ::hermes::vm::RuntimeConfig::Builder()
                    .withMicrotaskQueue(true)
                    .build();
            _runtime = fbhermes::makeHermesRuntime(runtimeConfig);
            // Must be set before any consumer captures `_jsQueueRef` by
            // value (their copy would otherwise carry a null runtime pointer
            // and silently skip the drain).
            _jsQueueRef.runtime = _runtime.get();
            _jsCallInvoker =
                std::make_shared<facebook::react::RNWJSQueueCallInvoker>(
                    _jsQueueRef);
            _nativeMethodCallInvoker =
                std::make_shared<facebook::react::RNWSerialNativeMethodCallInvoker>();
            // Bridge MUST be populated before `installTurboModules` — bridge-style
            // modules read `_bridge.runtime` / `_bridge.jsCallInvoker` from
            // their `-install` body on the first JS access.
            [self installCompatBridge];
            [self installConsole];
            [self installTimers];
            [self installUIManager];
            [self installReload];
            rnwInstallWebSocket(*_runtime, _jsQueueRef);
            rnwInstallXHR(*_runtime, _jsQueueRef);
            [self installTurboModules];
            [self installNativeModules];
        });
    }
    return self;
}

- (void)dealloc {
    // Zero the bridge's runtime so any surviving module can't dereference
    // a dangling `jsi::Runtime *`. The singleton itself stays alive — a
    // new host refills the slot.
    [RCTBridge.currentBridge _rnwSetRuntime:NULL
                              jsCallInvoker:nullptr];

    // Hermes objects must be destroyed on the JS queue.
    dispatch_queue_t queue = _jsQueue;
    if (queue != nil) {
        // Move into captures: ARC is already unwinding `self`, so its ivars
        // can't be dereferenced from inside the block.
        __block std::shared_ptr<jsi::Runtime> runtime = std::move(_runtime);
        __block auto timers = std::move(_timers);
        __block auto intervals = std::move(_intervalSources);
        dispatch_sync(queue, ^{
            for (auto &entry : intervals) {
                dispatch_source_cancel(entry.second);
            }
            intervals.clear();
            timers.clear();
            runtime.reset();
        });
    }
}

- (void)installCompatBridge {
    // Process singleton — a re-init overwrites the previous host's pointers.
    RCTBridge *bridge = RCTBridge.currentBridge ?: [[RCTBridge alloc] init];
    [bridge _rnwSetRuntime:_runtime.get() jsCallInvoker:_jsCallInvoker];
    [RCTBridge _rnwSetCurrentBridge:bridge];
}

- (void)installNativeModules {
    rnwInstallNativeModulesProxy(*_runtime, _jsCallInvoker, _nativeMethodCallInvoker);
}

- (void)installTurboModules {
    using namespace facebook::react;
    auto jsInvoker = _jsCallInvoker;
    auto nativeInvoker = _nativeMethodCallInvoker;
    TurboModuleBinding::install(
        *_runtime,
        [jsInvoker, nativeInvoker](const std::string &name) -> std::shared_ptr<TurboModule> {
            NSString *nsName =
                [[NSString alloc] initWithUTF8String:name.c_str()];
            return [RNWTurboModuleRegistry.shared
                lookupModuleNamed:nsName
                        jsInvoker:jsInvoker
                    nativeInvoker:nativeInvoker];
        });
}

- (void)installReload {
    jsi::Runtime &rt = *_runtime;
    __weak typeof(self) weakSelf = self;
    // Dispatch to main so the current JS callstack (Fast Refresh's
    // `performFullRefresh`) unwinds before re-evaluating a new bundle.
    auto reloadFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_RELOAD"),
        /*paramCount=*/0,
        [weakSelf](jsi::Runtime &innerRt,
                   const jsi::Value &,
                   const jsi::Value *,
                   size_t) -> jsi::Value {
            (void)innerRt;
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (strongSelf == nil) return jsi::Value::undefined();
            void (^block)(void) = strongSelf.onReloadRequest;
            if (block == nil) return jsi::Value::undefined();
            dispatch_async(dispatch_get_main_queue(), ^{
                block();
            });
            return jsi::Value::undefined();
        });
    rt.global().setProperty(rt, "__RNW_RELOAD", reloadFn);
}

- (void)installUIManager {
    __weak typeof(self) weakSelf = self;
    rnwInstallUIManager(*_runtime, _jsCallInvoker, ^(NSArray<RNWShadowNodeSnapshot *> *root) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (strongSelf != nil && strongSelf.onCommit != nil) {
            strongSelf.onCommit(root);
        }
    });
}

- (void)installTimers {
    jsi::Runtime &rt = *_runtime;
    __weak typeof(self) weakSelf = self;

    auto setTimeoutFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "setTimeout"),
        /*paramCount=*/2,
        [weakSelf](jsi::Runtime &innerRt,
                   const jsi::Value &,
                   const jsi::Value *args,
                   size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isObject() ||
                !args[0].getObject(innerRt).isFunction(innerRt)) {
                throw jsi::JSError(innerRt,
                    "setTimeout: first argument must be a function");
            }
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (strongSelf == nil) return jsi::Value(0.0);

            auto fn = std::make_shared<jsi::Function>(
                args[0].getObject(innerRt).getFunction(innerRt));
            double ms = (count >= 2 && args[1].isNumber())
                ? args[1].getNumber() : 0;

            uint64_t id = strongSelf->_nextTimerId++;
            strongSelf->_timers[id] = fn;

            // `runOnJSAfter` drains microtasks after the callback: React
            // schedules render work via the setImmediate polyfill, which
            // bottoms out here.
            int64_t delayNs = (int64_t)(ms * NSEC_PER_MSEC);
            strongSelf->_jsQueueRef.runOnJSAfter(delayNs, ^(jsi::Runtime &rt) {
                __strong typeof(weakSelf) host = weakSelf;
                if (host == nil) return;
                auto it = host->_timers.find(id);
                if (it == host->_timers.end()) return;
                auto callback = it->second;
                host->_timers.erase(it);
                try {
                    callback->call(rt);
                } catch (const jsi::JSError &e) {
                    NSLog(@"setTimeout callback threw: %s",
                          e.getMessage().c_str());
                } catch (...) {
                    NSLog(@"setTimeout callback threw: unknown");
                }
            });
            return jsi::Value(static_cast<double>(id));
        });
    rt.global().setProperty(rt, "setTimeout", setTimeoutFn);

    // clearTimeout/clearInterval are interchangeable per spec — erase the
    // callback (turning the pending dispatch into a no-op) and cancel the
    // source if it was an interval.
    void (^cancelTimer)(uint64_t) = ^(uint64_t id) {
        __strong typeof(weakSelf) host = weakSelf;
        if (host == nil) return;
        host->_timers.erase(id);
        auto srcIt = host->_intervalSources.find(id);
        if (srcIt != host->_intervalSources.end()) {
            dispatch_source_cancel(srcIt->second);
            host->_intervalSources.erase(srcIt);
        }
    };

    auto clearTimeoutFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "clearTimeout"),
        /*paramCount=*/1,
        [cancelTimer](jsi::Runtime &innerRt,
                      const jsi::Value &,
                      const jsi::Value *args,
                      size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isNumber()) return jsi::Value::undefined();
            cancelTimer(static_cast<uint64_t>(args[0].getNumber()));
            (void)innerRt;
            return jsi::Value::undefined();
        });
    rt.global().setProperty(rt, "clearTimeout", clearTimeoutFn);

    // Use a GCD dispatch source rather than chained dispatch_after so the
    // re-arming is owned by the runtime (no recursive __block dance).
    auto setIntervalFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "setInterval"),
        /*paramCount=*/2,
        [weakSelf](jsi::Runtime &innerRt,
                   const jsi::Value &,
                   const jsi::Value *args,
                   size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isObject() ||
                !args[0].getObject(innerRt).isFunction(innerRt)) {
                throw jsi::JSError(innerRt,
                    "setInterval: first argument must be a function");
            }
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (strongSelf == nil) return jsi::Value(0.0);

            auto fn = std::make_shared<jsi::Function>(
                args[0].getObject(innerRt).getFunction(innerRt));
            double ms = (count >= 2 && args[1].isNumber())
                ? args[1].getNumber() : 0;
            uint64_t id = strongSelf->_nextTimerId++;
            strongSelf->_timers[id] = fn;

            int64_t intervalNs = (int64_t)(ms * NSEC_PER_MSEC);
            dispatch_source_t source = dispatch_source_create(
                DISPATCH_SOURCE_TYPE_TIMER, 0, 0, strongSelf->_jsQueue);
            dispatch_source_set_timer(
                source,
                dispatch_time(DISPATCH_TIME_NOW, intervalNs),
                (uint64_t)intervalNs,
                /*leeway=*/0);
            // Already on the JS queue (source's target queue is `_jsQueue`),
            // so use `invokeOnJS` instead of re-dispatching via `runOnJS`.
            dispatch_source_set_event_handler(source, ^{
                __strong typeof(weakSelf) host = weakSelf;
                if (host == nil) {
                    dispatch_source_cancel(source);
                    return;
                }
                auto it = host->_timers.find(id);
                if (it == host->_timers.end()) {
                    // clearInterval beat us here; stop firing.
                    dispatch_source_cancel(source);
                    host->_intervalSources.erase(id);
                    return;
                }
                auto callback = it->second;
                host->_jsQueueRef.invokeOnJS(^(jsi::Runtime &rt) {
                    try {
                        callback->call(rt);
                    } catch (const jsi::JSError &e) {
                        NSLog(@"setInterval callback threw: %s",
                              e.getMessage().c_str());
                    } catch (...) {
                        NSLog(@"setInterval callback threw: unknown");
                    }
                });
            });
            strongSelf->_intervalSources[id] = source;
            dispatch_resume(source);
            return jsi::Value(static_cast<double>(id));
        });
    rt.global().setProperty(rt, "setInterval", setIntervalFn);

    auto clearIntervalFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "clearInterval"),
        /*paramCount=*/1,
        [cancelTimer](jsi::Runtime &innerRt,
                      const jsi::Value &,
                      const jsi::Value *args,
                      size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isNumber()) return jsi::Value::undefined();
            cancelTimer(static_cast<uint64_t>(args[0].getNumber()));
            (void)innerRt;
            return jsi::Value::undefined();
        });
    rt.global().setProperty(rt, "clearInterval", clearIntervalFn);
}

- (void)installConsole {
    jsi::Runtime &rt = *_runtime;
    __weak typeof(self) weakSelf = self;

    // String-only contract: the JS shim (`src/setupConsole.ts`) formats
    // `console.<level>(...)` args into a single message before calling here.
    auto logFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_log"),
        /*paramCount=*/2,
        [weakSelf](jsi::Runtime &innerRt,
                   const jsi::Value &,
                   const jsi::Value *args,
                   size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isString() || !args[1].isString()) {
                return jsi::Value::undefined();
            }
            std::string levelStr = args[0].getString(innerRt).utf8(innerRt);
            std::string msgStr = args[1].getString(innerRt).utf8(innerRt);
            RNWLogLevel level = RNWLogLevelLog;
            if (levelStr == "warn") level = RNWLogLevelWarn;
            else if (levelStr == "error") level = RNWLogLevelError;
            else if (levelStr == "info") level = RNWLogLevelInfo;
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (strongSelf != nil && strongSelf.onConsoleLog != nil) {
                NSString *message =
                    [[NSString alloc] initWithUTF8String:msgStr.c_str()];
                void (^callback)(RNWLogLevel, NSString *) =
                    strongSelf.onConsoleLog;
                dispatch_async(dispatch_get_main_queue(), ^{
                    callback(level, message);
                });
            }
            return jsi::Value::undefined();
        });
    rt.global().setProperty(rt, "__RNW_log", logFn);

    // Minimal bootstrap so logs from bundle init (before `setupConsole.ts`
    // installs the rich shim) reach the host. JS shim overrides this.
    static const char *kBootstrap =
        "globalThis.console = {"
        "  log:   function(m) { globalThis.__RNW_log('log',   String(m)); },"
        "  warn:  function(m) { globalThis.__RNW_log('warn',  String(m)); },"
        "  error: function(m) { globalThis.__RNW_log('error', String(m)); },"
        "  info:  function(m) { globalThis.__RNW_log('info',  String(m)); }"
        "};";
    rt.evaluateJavaScript(
        std::make_shared<jsi::StringBuffer>(std::string(kBootstrap)),
        "rnw://internal/console-bootstrap.js");
}

- (void)fireEventWithHandlerId:(NSInteger)handlerId payload:(id)payload {
    // Fire-and-forget so the SwiftUI action closure returns immediately.
    // `runOnJS` drains microtasks after the handler so any React work it
    // scheduled (setState → re-render) actually runs.
    _jsQueueRef.runOnJS(^(jsi::Runtime &rt) {
        try {
            jsi::Value events = rt.global().getProperty(rt, "__RNW_EVENTS");
            if (!events.isObject()) {
                return;
            }
            jsi::Object eventsObj = events.getObject(rt);
            jsi::Value dispatchVal = eventsObj.getProperty(rt, "dispatch");
            if (!dispatchVal.isObject()) return;
            jsi::Object dispatchObj = dispatchVal.getObject(rt);
            if (!dispatchObj.isFunction(rt)) return;
            jsi::Function dispatch = dispatchObj.getFunction(rt);

            jsi::Value payloadVal =
                payload != nil
                    ? facebook::react::TurboModuleConvertUtils::
                          convertObjCObjectToJSIValue(rt, payload)
                    : jsi::Value::undefined();
            dispatch.call(rt,
                          jsi::Value(static_cast<double>(handlerId)),
                          payloadVal);
        } catch (const jsi::JSError &e) {
            NSLog(@"fireEventWithHandlerId: JS error: %s",
                  e.getMessage().c_str());
        } catch (const std::exception &e) {
            NSLog(@"fireEventWithHandlerId: %s", e.what());
        } catch (...) {
            NSLog(@"fireEventWithHandlerId: unknown error");
        }
    });
}

- (void)fireEventByName:(NSString *)eventName payload:(id)payload {
    std::string nameUtf8 = [eventName UTF8String];
    _jsQueueRef.runOnJS(^(jsi::Runtime &rt) {
        try {
            jsi::Value events = rt.global().getProperty(rt, "__RNW_EVENTS");
            if (!events.isObject()) return;
            jsi::Object eventsObj = events.getObject(rt);
            jsi::Value dispatchVal = eventsObj.getProperty(rt, "dispatchEvent");
            if (!dispatchVal.isObject()) return;
            jsi::Object dispatchObj = dispatchVal.getObject(rt);
            if (!dispatchObj.isFunction(rt)) return;
            jsi::Function dispatch = dispatchObj.getFunction(rt);

            jsi::Value payloadVal =
                payload != nil
                    ? facebook::react::TurboModuleConvertUtils::
                          convertObjCObjectToJSIValue(rt, payload)
                    : jsi::Value::undefined();
            dispatch.call(rt,
                          jsi::String::createFromUtf8(rt, nameUtf8),
                          payloadVal);
        } catch (const jsi::JSError &e) {
            NSLog(@"fireEventByName: JS error: %s", e.getMessage().c_str());
        } catch (const std::exception &e) {
            NSLog(@"fireEventByName: %s", e.what());
        } catch (...) {
            NSLog(@"fireEventByName: unknown error");
        }
    });
}

- (void)evaluate:(NSData *)data
             url:(NSString *)url
      completion:(void (^)(NSError * _Nullable))completion {
    // The drain after bundle eval is load-bearing: React's first-render
    // `useEffect` callbacks are queued as microtasks. Skip the drain and
    // they never fire (fetch never runs, loading states hang).
    _jsQueueRef.runOnJS(^(jsi::Runtime &rt) {
        NSError *err = nil;
        try {
            // Hermes detects source vs bytecode from the buffer's first
            // bytes (bytecode magic header `0xC61FBC03…`) — same call
            // works for both.
            auto buffer = std::make_shared<RNWNSDataReadBuffer>(data);
            rt.evaluateJavaScript(buffer, std::string([url UTF8String]));
        } catch (const jsi::JSError &e) {
            err = [NSError
                errorWithDomain:@"ReactNativeWatchOS.Hermes"
                           code:1
                       userInfo:@{
                NSLocalizedDescriptionKey:
                    [NSString stringWithUTF8String:e.getMessage().c_str()],
                @"stack":
                    [NSString stringWithUTF8String:e.getStack().c_str()],
            }];
        } catch (const std::exception &e) {
            err = [NSError
                errorWithDomain:@"ReactNativeWatchOS.Hermes"
                           code:2
                       userInfo:@{
                NSLocalizedDescriptionKey:
                    [NSString stringWithUTF8String:e.what()],
            }];
        }
        if (completion != nil) {
            dispatch_async(dispatch_get_main_queue(), ^{
                completion(err);
            });
        }
    });
}

@end
