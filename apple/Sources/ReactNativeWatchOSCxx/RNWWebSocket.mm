#import "RNWWebSocket.h"

#include <memory>
#include <string>

namespace jsi = facebook::jsi;

// URLSession owns the delegate; delegate blocks capture host only via
// weak_ptr, so no retain cycle:
//   host → session → delegate → block(weak host)
// Open/close come via delegate protocol; receive completions don't.

@interface RNWWebSocketDelegate : NSObject <NSURLSessionWebSocketDelegate>
@property (nonatomic, copy, nullable) void (^onOpen)(void);
@property (nonatomic, copy, nullable) void (^onClose)(NSURLSessionWebSocketCloseCode code,
                                                      NSData *_Nullable reason);
@end

@implementation RNWWebSocketDelegate
- (void)URLSession:(NSURLSession *)session
     webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
 didOpenWithProtocol:(NSString *)protocol {
    if (self.onOpen) self.onOpen();
}
- (void)URLSession:(NSURLSession *)session
     webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
  didCloseWithCode:(NSURLSessionWebSocketCloseCode)closeCode
            reason:(NSData *)reason {
    if (self.onClose) self.onClose(closeCode, reason);
}
@end

// MARK: - RNWWebSocketHost

namespace {

class RNWWebSocketHost : public jsi::HostObject,
                        public std::enable_shared_from_this<RNWWebSocketHost> {
public:
    // Two-phase init: blocks in `start()` capture `weak_from_this()`, which
    // is only valid after the shared_ptr is alive.
    static std::shared_ptr<RNWWebSocketHost> create(
        jsi::Runtime &rt,
        NSString *url,
        facebook::react::RNWJSQueue jsQueue) {
        std::shared_ptr<RNWWebSocketHost> self(
            new RNWWebSocketHost(rt, url, jsQueue));
        self->buildMethodHandles();
        self->start();
        return self;
    }

    ~RNWWebSocketHost() override {
        // Pending completion blocks still fire; weak_from_this() returns
        // nullptr by then so they no-op.
        [_task cancel];
        [_session invalidateAndCancel];
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
        std::string n = name.utf8(rt);
        if (n == "send") return jsi::Value(rt, *_sendFn);
        if (n == "close") return jsi::Value(rt, *_closeFn);
        if (n == "readyState") return jsi::Value(static_cast<double>(_readyState));
        if (n == "url") return jsi::String::createFromUtf8(rt, _url);
        if (n == "onopen")
            return _onopen ? jsi::Value(rt, *_onopen) : jsi::Value::null();
        if (n == "onmessage")
            return _onmessage ? jsi::Value(rt, *_onmessage) : jsi::Value::null();
        if (n == "onerror")
            return _onerror ? jsi::Value(rt, *_onerror) : jsi::Value::null();
        if (n == "onclose")
            return _onclose ? jsi::Value(rt, *_onclose) : jsi::Value::null();
        return jsi::Value::undefined();
    }

    void set(jsi::Runtime &rt,
             const jsi::PropNameID &name,
             const jsi::Value &value) override {
        std::string n = name.utf8(rt);
        std::shared_ptr<jsi::Function> *slot = nullptr;
        if (n == "onopen") slot = &_onopen;
        else if (n == "onmessage") slot = &_onmessage;
        else if (n == "onerror") slot = &_onerror;
        else if (n == "onclose") slot = &_onclose;
        else return;
        if (value.isObject() && value.getObject(rt).isFunction(rt)) {
            *slot = std::make_shared<jsi::Function>(
                value.getObject(rt).getFunction(rt));
        } else if (value.isNull() || value.isUndefined()) {
            slot->reset();
        }
    }

    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
        std::vector<jsi::PropNameID> out;
        for (const char *n : {"send", "close", "readyState", "url",
                              "onopen", "onmessage", "onerror", "onclose"}) {
            out.push_back(jsi::PropNameID::forAscii(rt, n));
        }
        return out;
    }

private:
    RNWWebSocketHost(jsi::Runtime &rt,
                     NSString *url,
                     facebook::react::RNWJSQueue jsQueue)
        : _runtime(rt),
          _url([url UTF8String] ?: ""),
          _jsQueue(jsQueue) {
        _delegate = [[RNWWebSocketDelegate alloc] init];
        NSURLSessionConfiguration *config =
            [NSURLSessionConfiguration defaultSessionConfiguration];
        _session = [NSURLSession sessionWithConfiguration:config
                                                 delegate:_delegate
                                            delegateQueue:[NSOperationQueue mainQueue]];
        NSURL *parsedURL = [NSURL URLWithString:url];
        _task = [_session webSocketTaskWithURL:parsedURL];
    }

    void start() {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();

        _delegate.onOpen = ^{
            auto self = weakSelf.lock();
            if (!self) return;
            self->_readyState = 1; // OPEN
            self->fireEvent(self->_onopen, ^(jsi::Runtime &rt, jsi::Object &evt) {
                evt.setProperty(rt, "type", jsi::String::createFromUtf8(rt, "open"));
            });
        };

        _delegate.onClose = ^(NSURLSessionWebSocketCloseCode code, NSData *reason) {
            auto self = weakSelf.lock();
            if (!self) return;
            self->_readyState = 3; // CLOSED
            NSString *reasonStr = nil;
            if (reason != nil && reason.length > 0) {
                reasonStr = [[NSString alloc] initWithData:reason
                                                  encoding:NSUTF8StringEncoding];
            }
            const char *reasonCStr = reasonStr ? [reasonStr UTF8String] : "";
            double codeNum = static_cast<double>(code);
            self->fireEvent(self->_onclose,
                            ^(jsi::Runtime &rt, jsi::Object &evt) {
                evt.setProperty(rt, "type", jsi::String::createFromUtf8(rt, "close"));
                evt.setProperty(rt, "code", jsi::Value(codeNum));
                evt.setProperty(rt, "reason", jsi::String::createFromUtf8(rt, reasonCStr));
            });
        };

        [_task resume];
        receiveLoop();
    }

    void receiveLoop() {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();
        [_task receiveMessageWithCompletionHandler:
            ^(NSURLSessionWebSocketMessage *message, NSError *error) {
            auto self = weakSelf.lock();
            if (!self) return;
            if (error != nil) {
                // Cancellation also lands here. didCloseWithCode handles
                // clean closes separately.
                NSString *desc = error.localizedDescription ?: @"WebSocket error";
                const char *descCStr = [desc UTF8String] ?: "WebSocket error";
                self->fireEvent(self->_onerror,
                                ^(jsi::Runtime &rt, jsi::Object &evt) {
                    evt.setProperty(rt, "type", jsi::String::createFromUtf8(rt, "error"));
                    evt.setProperty(rt, "message",
                        jsi::String::createFromUtf8(rt, descCStr));
                });
                return; // do not re-arm
            }
            if (message != nil) {
                NSString *payload = nil;
                if (message.type == NSURLSessionWebSocketMessageTypeString) {
                    payload = message.string;
                } else if (message.data != nil) {
                    // HMR never sends binary; decode lossily anyway.
                    payload = [[NSString alloc] initWithData:message.data
                                                    encoding:NSUTF8StringEncoding];
                }
                const char *payloadCStr = payload ? [payload UTF8String] : "";
                self->fireEvent(self->_onmessage,
                                ^(jsi::Runtime &rt, jsi::Object &evt) {
                    evt.setProperty(rt, "type", jsi::String::createFromUtf8(rt, "message"));
                    evt.setProperty(rt, "data",
                        jsi::String::createFromUtf8(rt, payloadCStr));
                });
            }
            self->receiveLoop();
        }];
    }

    // Cached so `ws.send === ws.send` and JS-side method caching works.
    void buildMethodHandles() {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();
        jsi::Runtime &rt = _runtime;

        _sendFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "send"),
                /*paramCount=*/1,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *args,
                           size_t count) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self) return jsi::Value::undefined();
                    if (count < 1 || !args[0].isString()) {
                        throw jsi::JSError(innerRt,
                            "WebSocket.send: argument must be a string");
                    }
                    std::string s = args[0].getString(innerRt).utf8(innerRt);
                    NSString *str = [[NSString alloc]
                        initWithBytes:s.data() length:s.size()
                             encoding:NSUTF8StringEncoding];
                    NSURLSessionWebSocketMessage *msg =
                        [[NSURLSessionWebSocketMessage alloc] initWithString:str];
                    [self->_task sendMessage:msg
                          completionHandler:^(NSError *error) {
                        if (error != nil) {
                            NSLog(@"WebSocket.send failed: %@",
                                  error.localizedDescription);
                        }
                    }];
                    return jsi::Value::undefined();
                }));

        _closeFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "close"),
                /*paramCount=*/0,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *,
                           size_t) -> jsi::Value {
                    (void)innerRt;
                    auto self = weakSelf.lock();
                    if (!self) return jsi::Value::undefined();
                    if (self->_readyState == 2 || self->_readyState == 3) {
                        return jsi::Value::undefined();
                    }
                    self->_readyState = 2; // CLOSING
                    [self->_task cancelWithCloseCode:
                        NSURLSessionWebSocketCloseCodeNormalClosure
                                              reason:nil];
                    return jsi::Value::undefined();
                }));
    }

    // Hops to the JS queue (delegate/completion handlers land on main).
    // Swallows JS exceptions — no surface to report them to.
    void fireEvent(const std::shared_ptr<jsi::Function> &fn,
                   void (^build)(jsi::Runtime &rt, jsi::Object &evt)) {
        if (!fn) return;
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();
        auto sharedFn = fn;
        _jsQueue.runAsync(^{
            auto self = weakSelf.lock();
            if (!self) return;
            try {
                jsi::Object evt(self->_runtime);
                build(self->_runtime, evt);
                sharedFn->call(self->_runtime,
                               jsi::Value(self->_runtime, evt));
            } catch (const jsi::JSError &e) {
                NSLog(@"WebSocket event handler threw: %s",
                      e.getMessage().c_str());
            } catch (...) {
                NSLog(@"WebSocket event handler threw: unknown");
            }
        });
    }

    jsi::Runtime &_runtime;
    std::string _url;
    facebook::react::RNWJSQueue _jsQueue;
    NSURLSession *_session = nil;
    NSURLSessionWebSocketTask *_task = nil;
    RNWWebSocketDelegate *_delegate = nil;
    std::shared_ptr<jsi::Function> _sendFn;
    std::shared_ptr<jsi::Function> _closeFn;
    std::shared_ptr<jsi::Function> _onopen;
    std::shared_ptr<jsi::Function> _onmessage;
    std::shared_ptr<jsi::Function> _onerror;
    std::shared_ptr<jsi::Function> _onclose;
    int _readyState = 0; // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
};

} // namespace

void rnwInstallWebSocket(jsi::Runtime &rt,
                         facebook::react::RNWJSQueue jsQueue) {
    // Hermes host functions can't be used with `new`. Install a private
    // factory and wrap it in a plain JS function (which IS constructible).
    auto factory = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_create_websocket"),
        /*paramCount=*/1,
        [jsQueue](jsi::Runtime &innerRt,
                  const jsi::Value &,
                  const jsi::Value *args,
                  size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(innerRt,
                    "WebSocket: URL argument must be a string");
            }
            std::string urlStr = args[0].getString(innerRt).utf8(innerRt);
            NSString *urlNS = [[NSString alloc]
                initWithBytes:urlStr.data() length:urlStr.size()
                     encoding:NSUTF8StringEncoding];
            auto host = RNWWebSocketHost::create(innerRt, urlNS, jsQueue);
            return jsi::Object::createFromHostObject(innerRt, host);
        });
    rt.global().setProperty(rt, "__RNW_create_websocket", factory);

    // Explicit return replaces the runtime-created `this`, so `new
    // WebSocket(url)` yields the HostObject instead of an empty wrapper.
    auto buffer = std::make_shared<jsi::StringBuffer>(std::string(
        "globalThis.WebSocket = function WebSocket(url) {"
        "  return globalThis.__RNW_create_websocket(url);"
        "};"));
    rt.evaluateJavaScript(buffer, "<rnw-websocket-shim>");
}
