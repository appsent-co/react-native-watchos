#import "RNWWebSocket.h"
#import "RNWNSDataBuffer.h"
#include "RNWWebSocketScript.h"

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

namespace jsi = facebook::jsi;

// Two layers. Native (`RNWWebSocketHost`) is a thin transport over
// `NSURLSessionWebSocketTask` exposed as one factory:
//
//   globalThis.__RNW_ws_connect(url, protocols, headers, handlers) → transport
//
//   protocols = string[]                    (Sec-WebSocket-Protocol offer)
//   headers   = [name, value, name, value…] (extra upgrade-request headers)
//   handlers  = { onOpen(protocol, extensions), onMessage(string | ArrayBuffer),
//                 onError(message), onClose(code, reason, wasClean) }
//   transport = { send(string | ArrayBuffer), close(code, reason),
//                 bufferedAmount, dispose() }
//
// The compatibility adapter (runtime/WebSocket.js) is JS evaluated at
// install time, so a bare Hermes consumer and `src/devSupport`'s HMR client
// need no import.
//
// Threading: `delegateQueue:nil` puts every delegate callback and completion
// handler on one serial URLSession queue, in order. Each hop into JS goes
// through `RNWJSQueue::runOnJS`, which drains Hermes' microtask queue after
// the handler returns — a promise resolved inside a `message` or `open`
// handler must continue before the next timer tick.
//
// Terminal event: `URLSession:task:didCompleteWithError:` fires in every
// ending (clean close, dropped TCP, rejected upgrade, local cancel), so it is
// the single place a `close` is emitted, guarded by `_terminated`.
// `didCloseWithCode:` and receive errors only record state.
//
// Close codes: `URLSessionWebSocketTask.CloseCode` has no case for 1012–1014.
// For those URLSession reports `NoStatusReceived` (1005) and hands the RAW
// close-frame payload (2-byte big-endian code + UTF-8 reason) as `reason`; a
// genuine no-code close arrives as 1005 with an empty reason, and every code
// in the enum arrives with its reason only. RFC 6455 §5.5.1 puts a reason only
// after a code, so "1005 with bytes" is unambiguous and `recoverCloseFrame`
// decodes the real code and reason from it.
//
// Ownership: JS wrapper → HostObject (shared_ptr held by Hermes) → session →
// delegate → blocks capturing `weak_ptr<host>`. The host holds the four
// handler `jsi::Function`s strongly, closing a cycle back to the JS wrapper;
// the JS layer calls `dispose()` after the close event to break it.
//
// Handle release: the `jsi::Function` members may only be released on the JS
// queue. A URLSession-queue block that `lock()`s the weak_ptr can be the last
// owner, so the destructor detects the off-queue case and hands the handles to
// `RNWJSQueue::destroyOnJS` (see RNWCallInvoker.h).

// URLSession's default is 1 MiB, and one inbound message a byte over it fails
// the receive with NSPOSIXErrorDomain 40 and kills the socket.
static const NSInteger kRNWWebSocketMaxMessageSize = 16 * 1024 * 1024;

@interface RNWWebSocketDelegate : NSObject <NSURLSessionWebSocketDelegate>
@property (nonatomic, copy, nullable) void (^onOpen)(NSURLSessionWebSocketTask *task,
                                                     NSString *_Nullable protocol);
@property (nonatomic, copy, nullable) void (^onCloseFrame)(NSURLSessionWebSocketCloseCode code,
                                                           NSData *_Nullable reason);
@property (nonatomic, copy, nullable) void (^onComplete)(NSError *_Nullable error);
@end

@implementation RNWWebSocketDelegate
- (void)URLSession:(NSURLSession *)session
     webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
 didOpenWithProtocol:(NSString *)protocol {
    if (self.onOpen) self.onOpen(webSocketTask, protocol);
}
- (void)URLSession:(NSURLSession *)session
     webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
  didCloseWithCode:(NSURLSessionWebSocketCloseCode)closeCode
            reason:(NSData *)reason {
    if (self.onCloseFrame) self.onCloseFrame(closeCode, reason);
}
- (void)URLSession:(NSURLSession *)session
              task:(NSURLSessionTask *)task
didCompleteWithError:(NSError *)error {
    if (self.onComplete) self.onComplete(error);
}
@end

// MARK: - RNWWebSocketHost

namespace {

// Byte length, never `std::string(const char *)`: U+0000 is legal in a text
// frame and in a close reason.
std::string utf8FromNSString(NSString *_Nullable s) {
    if (s == nil) return "";
    const char *c = [s UTF8String];
    if (c == nullptr) return "";
    return std::string(c, [s lengthOfBytesUsingEncoding:NSUTF8StringEncoding]);
}

// Validated through NSString so Hermes is never handed malformed UTF-8 (a
// malformed reason reads back empty).
std::string utf8FromNSData(NSData *_Nullable d) {
    if (d == nil || d.length == 0) return "";
    NSString *s = [[NSString alloc] initWithData:d encoding:NSUTF8StringEncoding];
    return utf8FromNSString(s);
}

// Undo URLSession's fallback for close codes outside its enum (see the
// header comment): 1005 + a non-empty reason is the raw close payload.
void recoverCloseFrame(NSURLSessionWebSocketCloseCode code,
                       NSData *_Nullable reason,
                       int &outCode,
                       std::string &outReason) {
    outCode = static_cast<int>(code);
    if (code == NSURLSessionWebSocketCloseCodeNoStatusReceived && reason.length >= 2) {
        const uint8_t *b = static_cast<const uint8_t *>(reason.bytes);
        int raw = (b[0] << 8) | b[1];
        // RFC 6455 §7.4: 1000–4999 is the whole space a peer may send.
        if (raw >= 1000 && raw <= 4999) {
            outCode = raw;
            outReason = utf8FromNSData(
                [reason subdataWithRange:NSMakeRange(2, reason.length - 2)]);
            return;
        }
    }
    outReason = utf8FromNSData(reason);
}

NSString *nsStringFromUtf8(const std::string &s) {
    NSString *out = [[NSString alloc] initWithBytes:s.data()
                                             length:s.size()
                                           encoding:NSUTF8StringEncoding];
    return out ?: @"";
}

// Use Foundation's URL parser once for both the public URL and the request.
// This runtime accepts absolute URLs; there is no document base URL.
NSURL *normalizeWebSocketURL(jsi::Runtime &rt, const std::string &input) {
    NSURLComponents *parts = [NSURLComponents componentsWithString:nsStringFromUtf8(input)];
    NSString *scheme = parts.scheme.lowercaseString;
    if ([scheme isEqualToString:@"http"]) scheme = @"ws";
    if ([scheme isEqualToString:@"https"]) scheme = @"wss";
    if (parts == nil || parts.host.length == 0 || parts.fragment != nil ||
        !([scheme isEqualToString:@"ws"] || [scheme isEqualToString:@"wss"]) ||
        (parts.port != nil && (parts.port.integerValue < 0 || parts.port.integerValue > 65535))) {
        throw jsi::JSError(rt, "WebSocket: expected an absolute ws/wss URL without a fragment");
    }
    parts.scheme = scheme;
    parts.host = parts.host.lowercaseString;
    if (([scheme isEqualToString:@"ws"] && parts.port.integerValue == 80) ||
        ([scheme isEqualToString:@"wss"] && parts.port.integerValue == 443)) {
        parts.port = nil;
    }
    if (parts.percentEncodedPath.length == 0) parts.percentEncodedPath = @"/";
    NSURL *url = parts.URL;
    if (url == nil) throw jsi::JSError(rt, "WebSocket: invalid URL");
    return url;
}

class RNWWebSocketHost : public jsi::HostObject,
                        public std::enable_shared_from_this<RNWWebSocketHost> {
public:
    // Two-phase init: blocks in `start()` capture `weak_from_this()`, which
    // is only valid after the shared_ptr is alive.
    static std::shared_ptr<RNWWebSocketHost> create(
        jsi::Runtime &rt,
        NSURL *url,
        NSArray<NSString *> *protocols,
        NSDictionary<NSString *, NSString *> *headers,
        std::shared_ptr<jsi::Function> onOpen,
        std::shared_ptr<jsi::Function> onMessage,
        std::shared_ptr<jsi::Function> onError,
        std::shared_ptr<jsi::Function> onClose,
        facebook::react::RNWJSQueue jsQueue) {
        std::shared_ptr<RNWWebSocketHost> self(new RNWWebSocketHost(
            url, protocols, headers,
            std::move(onOpen), std::move(onMessage),
            std::move(onError), std::move(onClose),
            jsQueue));
        self->buildMethodHandles(rt);
        self->start();
        return self;
    }

    // On the JS queue (Hermes' finalizer) the `jsi::Function` members are
    // released inline. Off it (a URLSession completion held the last
    // reference) they go through `destroyOnJS`, which releases them on the
    // JS queue while the runtime is alive and leaks them otherwise.
    ~RNWWebSocketHost() override {
        [_task cancel];
        [_session invalidateAndCancel];
        if (_jsQueue.isCurrent()) return;
        auto bag = std::make_shared<std::vector<std::shared_ptr<jsi::Function>>>();
        for (auto *slot : {&_sendFn, &_closeFn, &_disposeFn,
                           &_onOpen, &_onMessage, &_onError, &_onClose}) {
            if (*slot) bag->push_back(std::move(*slot));
        }
        _jsQueue.destroyOnJS(std::move(bag));
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
        std::string n = name.utf8(rt);
        if (n == "url") return jsi::String::createFromUtf8(rt, utf8FromNSString(_task.originalRequest.URL.absoluteString));
        if (n == "send") return jsi::Value(rt, *_sendFn);
        if (n == "close") return jsi::Value(rt, *_closeFn);
        if (n == "dispose") return jsi::Value(rt, *_disposeFn);
        if (n == "bufferedAmount") {
            return jsi::Value(static_cast<double>(_bufferedAmount.load()));
        }
        return jsi::Value::undefined();
    }

    void set(jsi::Runtime &, const jsi::PropNameID &, const jsi::Value &) override {}

    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
        std::vector<jsi::PropNameID> out;
        for (const char *n : {"url", "send", "close", "dispose", "bufferedAmount"}) {
            out.push_back(jsi::PropNameID::forAscii(rt, n));
        }
        return out;
    }

private:
    RNWWebSocketHost(NSURL *url,
                     NSArray<NSString *> *protocols,
                     NSDictionary<NSString *, NSString *> *headers,
                     std::shared_ptr<jsi::Function> onOpen,
                     std::shared_ptr<jsi::Function> onMessage,
                     std::shared_ptr<jsi::Function> onError,
                     std::shared_ptr<jsi::Function> onClose,
                     facebook::react::RNWJSQueue jsQueue)
        : _jsQueue(jsQueue),
          _onOpen(std::move(onOpen)),
          _onMessage(std::move(onMessage)),
          _onError(std::move(onError)),
          _onClose(std::move(onClose)) {
        _delegate = [[RNWWebSocketDelegate alloc] init];
        NSURLSessionConfiguration *config =
            [NSURLSessionConfiguration defaultSessionConfiguration];
        _session = [NSURLSession sessionWithConfiguration:config
                                                 delegate:_delegate
                                            delegateQueue:nil];
        // `webSocketTaskWithRequest:` so caller headers reach the upgrade
        // request; the `Sec-WebSocket-Protocol` header is all the
        // `…WithURL:protocols:` variant does with its offer.
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        [headers enumerateKeysAndObjectsUsingBlock:^(NSString *name, NSString *value, BOOL *) {
            [request setValue:value forHTTPHeaderField:name];
        }];
        if (protocols.count > 0) {
            [request setValue:[protocols componentsJoinedByString:@", "]
                forHTTPHeaderField:@"Sec-WebSocket-Protocol"];
        }
        _task = [_session webSocketTaskWithRequest:request];
        _task.maximumMessageSize = kRNWWebSocketMaxMessageSize;
    }

    void start() {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();

        _delegate.onOpen = ^(NSURLSessionWebSocketTask *task, NSString *protocol) {
            auto self = weakSelf.lock();
            if (!self) return;
            NSString *extensions = nil;
            if ([task.response isKindOfClass:[NSHTTPURLResponse class]]) {
                extensions = [(NSHTTPURLResponse *)task.response
                    valueForHTTPHeaderField:@"Sec-WebSocket-Extensions"];
            }
            std::string protocolStr = utf8FromNSString(protocol);
            std::string extensionsStr = utf8FromNSString(extensions);
            self->emit(^(jsi::Runtime &rt, RNWWebSocketHost &host) {
                if (!host._onOpen) return;
                host._onOpen->call(rt, protocolStr, extensionsStr);
            });
        };

        // Only fires when a receive is armed as the peer's close frame lands.
        // Records state; `didCompleteWithError:` emits.
        _delegate.onCloseFrame = ^(NSURLSessionWebSocketCloseCode code, NSData *reason) {
            auto self = weakSelf.lock();
            if (!self) return;
            int peerCode = 1005;
            std::string peerReason;
            recoverCloseFrame(code, reason, peerCode, peerReason);
            std::lock_guard<std::mutex> lock(self->_mutex);
            self->_sawCloseFrame = true;
            self->_peerCode = peerCode;
            self->_peerReason = peerReason;
        };

        _delegate.onComplete = ^(NSError *error) {
            auto self = weakSelf.lock();
            if (!self) return;
            self->handleCompletion(error);
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
                // The socket is dead or cancelled; keep the reason for
                // handleCompletion, which `didCompleteWithError:` triggers.
                std::lock_guard<std::mutex> lock(self->_mutex);
                if (self->_lastErrorMessage.empty()) {
                    self->_lastErrorMessage = utf8FromNSString(error.localizedDescription);
                }
                return;
            }
            if (message.type == NSURLSessionWebSocketMessageTypeString) {
                std::string text = utf8FromNSString(message.string);
                self->emit(^(jsi::Runtime &rt, RNWWebSocketHost &host) {
                    if (!host._onMessage) return;
                    host._onMessage->call(rt, text);
                });
            } else {
                NSData *data = message.data ?: [NSData data];
                self->emit(^(jsi::Runtime &rt, RNWWebSocketHost &host) {
                    if (!host._onMessage) return;
                    auto buffer = std::make_shared<RNWNSDataBuffer>(data);
                    jsi::ArrayBuffer ab(rt, buffer);
                    host._onMessage->call(rt, jsi::Value(rt, ab));
                });
            }
            self->receiveLoop();
        }];
    }

    // Single terminal event. Exactly one `close` per socket; an `error`
    // precedes it only when the connection failed on its own.
    void handleCompletion(NSError *error) {
        bool sawCloseFrame = false;
        bool localCloseRequested = false;
        int peerCode = 1005;
        std::string peerReason;
        std::string lastErrorMessage;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            if (_terminated) return;
            _terminated = true;
            sawCloseFrame = _sawCloseFrame;
            localCloseRequested = _localCloseRequested;
            peerCode = _peerCode;
            peerReason = _peerReason;
            lastErrorMessage = _lastErrorMessage;
        }
        if (sawCloseFrame) {
            emitClose(peerCode, peerReason, /*wasClean=*/true);
            return;
        }
        if (localCloseRequested) {
            // A local close the peer never answered is unclean but not an
            // `error`: the caller asked for it.
            emitClose(1006, "", /*wasClean=*/false);
            return;
        }
        std::string message = utf8FromNSString(error.localizedDescription);
        if (message.empty()) message = lastErrorMessage;
        if (message.empty()) message = "WebSocket closed unexpectedly";
        emitError(message);
        emitClose(1006, "", /*wasClean=*/false);
    }

    // Strings by value on purpose: a block captures a C++ reference parameter
    // as the reference, and the caller's local is gone by the time the block
    // runs on the JS queue.
    void emitError(std::string message) {
        emit(^(jsi::Runtime &rt, RNWWebSocketHost &host) {
            if (!host._onError) return;
            host._onError->call(rt, message);
        });
    }

    void emitClose(int code, std::string reason, bool wasClean) {
        emit(^(jsi::Runtime &rt, RNWWebSocketHost &host) {
            if (!host._onClose) return;
            host._onClose->call(rt, static_cast<double>(code), reason, wasClean);
        });
    }

    // Swallows JS exceptions: the JS layer isolates listener throws, so
    // anything reaching here is a bug in the shim itself.
    void emit(void (^body)(jsi::Runtime &rt, RNWWebSocketHost &host)) {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();
        _jsQueue.runOnJS(^(jsi::Runtime &rt) {
            auto self = weakSelf.lock();
            if (!self) return;
            try {
                body(rt, *self);
            } catch (const jsi::JSError &e) {
                NSLog(@"[RNWWebSocket] handler threw: %s", e.getMessage().c_str());
            } catch (const std::exception &e) {
                NSLog(@"[RNWWebSocket] handler threw: %s", e.what());
            } catch (...) {
                NSLog(@"[RNWWebSocket] handler threw: unknown");
            }
        });
    }

    // Cached so the JS layer's `this._native.send` is one stable function.
    void buildMethodHandles(jsi::Runtime &rt) {
        std::weak_ptr<RNWWebSocketHost> weakSelf = weak_from_this();

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
                    if (!self || self->_disposed) return jsi::Value::undefined();
                    if (count < 1) {
                        throw jsi::JSError(innerRt, "WebSocket.send: missing argument");
                    }
                    const jsi::Value &v = args[0];
                    NSURLSessionWebSocketMessage *msg = nil;
                    size_t byteLength = 0;
                    if (v.isString()) {
                        std::string s = v.getString(innerRt).utf8(innerRt);
                        byteLength = s.size();
                        msg = [[NSURLSessionWebSocketMessage alloc]
                            initWithString:nsStringFromUtf8(s)];
                    } else if (v.isObject() &&
                               v.getObject(innerRt).isArrayBuffer(innerRt)) {
                        jsi::ArrayBuffer ab = v.getObject(innerRt).getArrayBuffer(innerRt);
                        byteLength = ab.size(innerRt);
                        // Copied: sendMessage: is asynchronous and the JS heap
                        // may move or free the ArrayBuffer's bytes.
                        NSData *data = [NSData dataWithBytes:ab.data(innerRt)
                                                      length:byteLength];
                        msg = [[NSURLSessionWebSocketMessage alloc] initWithData:data];
                    } else {
                        throw jsi::JSError(innerRt,
                            "WebSocket.send: data must be a string or ArrayBuffer");
                    }
                    self->_bufferedAmount.fetch_add(byteLength);
                    [self->_task sendMessage:msg completionHandler:^(NSError *error) {
                        auto inner = weakSelf.lock();
                        if (!inner) return;
                        inner->_bufferedAmount.fetch_sub(byteLength);
                        if (error == nil) return;
                        {
                            std::lock_guard<std::mutex> lock(inner->_mutex);
                            if (inner->_lastErrorMessage.empty()) {
                                inner->_lastErrorMessage =
                                    utf8FromNSString(error.localizedDescription);
                            }
                        }
                        [inner->_task cancel];
                    }];
                    return jsi::Value::undefined();
                }));

        _closeFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "close"),
                /*paramCount=*/2,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *args,
                           size_t count) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self || self->_disposed) return jsi::Value::undefined();
                    int code = (count >= 1 && args[0].isNumber())
                        ? static_cast<int>(args[0].getNumber()) : 1000;
                    std::string reason = (count >= 2 && args[1].isString())
                        ? args[1].getString(innerRt).utf8(innerRt) : "";
                    {
                        std::lock_guard<std::mutex> lock(self->_mutex);
                        if (self->_localCloseRequested) return jsi::Value::undefined();
                        self->_localCloseRequested = true;
                    }
                    NSData *reasonData = reason.empty()
                        ? nil
                        : [NSData dataWithBytes:reason.data() length:reason.size()];
                    [self->_task cancelWithCloseCode:(NSURLSessionWebSocketCloseCode)code
                                              reason:reasonData];
                    return jsi::Value::undefined();
                }));

        _disposeFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "dispose"),
                /*paramCount=*/0,
                [weakSelf](jsi::Runtime &, const jsi::Value &,
                           const jsi::Value *, size_t) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self || self->_disposed) return jsi::Value::undefined();
                    self->_disposed = true;
                    self->_onOpen.reset();
                    self->_onMessage.reset();
                    self->_onError.reset();
                    self->_onClose.reset();
                    [self->_task cancel];
                    [self->_session invalidateAndCancel];
                    return jsi::Value::undefined();
                }));
    }

    facebook::react::RNWJSQueue _jsQueue;
    NSURLSession *_session = nil;
    NSURLSessionWebSocketTask *_task = nil;
    RNWWebSocketDelegate *_delegate = nil;

    std::shared_ptr<jsi::Function> _sendFn;
    std::shared_ptr<jsi::Function> _closeFn;
    std::shared_ptr<jsi::Function> _disposeFn;

    // JS-queue only.
    std::shared_ptr<jsi::Function> _onOpen;
    std::shared_ptr<jsi::Function> _onMessage;
    std::shared_ptr<jsi::Function> _onError;
    std::shared_ptr<jsi::Function> _onClose;
    bool _disposed = false;

    std::atomic<size_t> _bufferedAmount{0};

    // Written from both the JS queue (close) and URLSession's queue.
    std::mutex _mutex;
    bool _terminated = false;
    bool _sawCloseFrame = false;
    bool _localCloseRequested = false;
    int _peerCode = 1005;
    std::string _peerReason;
    std::string _lastErrorMessage;
};


} // namespace

void rnwInstallWebSocket(jsi::Runtime &rt,
                         facebook::react::RNWJSQueue jsQueue) {
    auto factory = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_ws_connect"),
        /*paramCount=*/4,
        [jsQueue](jsi::Runtime &innerRt,
                  const jsi::Value &,
                  const jsi::Value *args,
                  size_t count) -> jsi::Value {
            if (count < 4 || !args[0].isString() ||
                !args[1].isObject() || !args[1].getObject(innerRt).isArray(innerRt) ||
                !args[2].isObject() || !args[2].getObject(innerRt).isArray(innerRt) ||
                !args[3].isObject()) {
                throw jsi::JSError(innerRt,
                    "__RNW_ws_connect: expected (url: string, protocols: string[], "
                    "headers: string[], handlers)");
            }
            std::string urlStr = args[0].getString(innerRt).utf8(innerRt);
            NSURL *url = normalizeWebSocketURL(innerRt, urlStr);

            jsi::Array list = args[1].getObject(innerRt).getArray(innerRt);
            NSMutableArray<NSString *> *protocols = [NSMutableArray array];
            size_t n = list.size(innerRt);
            for (size_t i = 0; i < n; i++) {
                jsi::Value item = list.getValueAtIndex(innerRt, i);
                if (!item.isString()) {
                    throw jsi::JSError(innerRt, "WebSocket: subprotocols must be strings");
                }
                [protocols addObject:nsStringFromUtf8(item.getString(innerRt).utf8(innerRt))];
            }

            jsi::Array headerList = args[2].getObject(innerRt).getArray(innerRt);
            NSMutableDictionary<NSString *, NSString *> *headers = [NSMutableDictionary dictionary];
            size_t headerCount = headerList.size(innerRt);
            if (headerCount % 2 != 0) {
                throw jsi::JSError(innerRt, "__RNW_ws_connect: headers must be [name, value, …]");
            }
            for (size_t i = 0; i + 1 < headerCount; i += 2) {
                jsi::Value name = headerList.getValueAtIndex(innerRt, i);
                jsi::Value value = headerList.getValueAtIndex(innerRt, i + 1);
                if (!name.isString() || !value.isString()) {
                    throw jsi::JSError(innerRt, "__RNW_ws_connect: header names and values must be strings");
                }
                headers[nsStringFromUtf8(name.getString(innerRt).utf8(innerRt))] =
                    nsStringFromUtf8(value.getString(innerRt).utf8(innerRt));
            }

            jsi::Object handlers = args[3].getObject(innerRt);
            auto handler = [&](const char *name) {
                jsi::Value v = handlers.getProperty(innerRt, name);
                if (!v.isObject() || !v.getObject(innerRt).isFunction(innerRt)) {
                    throw jsi::JSError(innerRt,
                        std::string("__RNW_ws_connect: handlers.") + name + " must be a function");
                }
                return std::make_shared<jsi::Function>(v.getObject(innerRt).getFunction(innerRt));
            };
            auto host = RNWWebSocketHost::create(
                innerRt, url, protocols, headers,
                handler("onOpen"), handler("onMessage"),
                handler("onError"), handler("onClose"),
                jsQueue);
            return jsi::Object::createFromHostObject(innerRt, host);
        });
    rt.global().setProperty(rt, "__RNW_ws_connect", factory);

    auto buffer = std::make_shared<jsi::StringBuffer>(std::string(kRNWWebSocketScript));
    rt.evaluateJavaScript(buffer, "<rnw-websocket-shim>");
}
