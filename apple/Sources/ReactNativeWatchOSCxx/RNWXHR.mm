#import "RNWXHR.h"

#include <memory>
#include <string>
#include <vector>

namespace jsi = facebook::jsi;

namespace {

// Shared so connection pooling + HTTP/2 multiplexing kick in (TLS handshakes
// burn radio on a watch) and shared cookie storage applies.
NSURLSession *RNWSharedXHRSession() {
    static NSURLSession *session = nil;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        NSURLSessionConfiguration *config =
            [NSURLSessionConfiguration defaultSessionConfiguration];
        session = [NSURLSession sessionWithConfiguration:config
                                                delegate:nil
                                           delegateQueue:nil];
    });
    return session;
}

// Zero-copy ArrayBuffer storage backed by NSData. ArrayBuffer doesn't
// mutate after construction, so handing out a const pointer cast is fine.
class RNWNSDataBuffer : public jsi::MutableBuffer {
public:
    explicit RNWNSDataBuffer(NSData *data) : data_(data) {}
    size_t size() const override { return data_.length; }
    uint8_t *data() override {
        return reinterpret_cast<uint8_t *>(const_cast<void *>(data_.bytes));
    }
private:
    NSData *data_;
};

void appendHeaderLine(std::string &out, NSString *name, NSString *value) {
    out += [name UTF8String] ?: "";
    out += ": ";
    out += [value UTF8String] ?: "";
    out += "\r\n";
}

class RNWXHRHost : public jsi::HostObject,
                  public std::enable_shared_from_this<RNWXHRHost> {
public:
    // Two-phase init: `buildMethodHandles()` captures `weak_from_this()`,
    // valid only after the shared_ptr exists.
    static std::shared_ptr<RNWXHRHost> create(
        jsi::Runtime &rt,
        facebook::react::RNWJSQueue jsQueue) {
        std::shared_ptr<RNWXHRHost> self(new RNWXHRHost(rt, jsQueue));
        self->buildMethodHandles();
        return self;
    }

    ~RNWXHRHost() override {
        // Pending completion still fires; weak_from_this() returns nullptr
        // by then so the block no-ops.
        [_task cancel];
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
        std::string n = name.utf8(rt);

        if (n == "open") return jsi::Value(rt, *_openFn);
        if (n == "send") return jsi::Value(rt, *_sendFn);
        if (n == "abort") return jsi::Value(rt, *_abortFn);
        if (n == "setRequestHeader") return jsi::Value(rt, *_setReqHeaderFn);
        if (n == "getResponseHeader") return jsi::Value(rt, *_getRespHeaderFn);
        if (n == "getAllResponseHeaders")
            return jsi::Value(rt, *_getAllRespHeadersFn);
        if (n == "overrideMimeType") return jsi::Value(rt, *_overrideMimeFn);

        if (n == "readyState") return jsi::Value(static_cast<double>(_readyState));
        if (n == "status") return jsi::Value(static_cast<double>(_status));
        if (n == "statusText")
            return jsi::String::createFromUtf8(rt, _statusText);
        if (n == "responseURL")
            return jsi::String::createFromUtf8(rt, _responseURL);
        if (n == "responseType")
            return jsi::String::createFromUtf8(rt, _responseType);
        if (n == "timeout") return jsi::Value(static_cast<double>(_timeoutMs));
        if (n == "withCredentials") return jsi::Value(_withCredentials);

        if (n == "response") {
            if (_responseType == "" || _responseType == "text" ||
                _responseType == "json") {
                return jsi::String::createFromUtf8(rt, _responseText);
            }
            if (_responseType == "arraybuffer") {
                if (_responseData == nil) return jsi::Value::null();
                if (!_responseAB) {
                    auto buf = std::make_shared<RNWNSDataBuffer>(_responseData);
                    _responseAB = std::make_shared<jsi::ArrayBuffer>(rt, buf);
                }
                return jsi::Value(rt, *_responseAB);
            }
            // 'blob' (no Blob in Hermes) — null lets fetch's blob() reject
            // gracefully instead of throwing here.
            return jsi::Value::null();
        }
        if (n == "responseText")
            return jsi::String::createFromUtf8(rt, _responseText);

        if (n == "onreadystatechange")
            return _onreadystatechange ? jsi::Value(rt, *_onreadystatechange)
                                       : jsi::Value::null();
        if (n == "onload")
            return _onload ? jsi::Value(rt, *_onload) : jsi::Value::null();
        if (n == "onerror")
            return _onerror ? jsi::Value(rt, *_onerror) : jsi::Value::null();
        if (n == "onabort")
            return _onabort ? jsi::Value(rt, *_onabort) : jsi::Value::null();
        if (n == "ontimeout")
            return _ontimeout ? jsi::Value(rt, *_ontimeout) : jsi::Value::null();
        if (n == "onloadend")
            return _onloadend ? jsi::Value(rt, *_onloadend) : jsi::Value::null();

        // whatwg-fetch reads `xhr.DONE`, not `XMLHttpRequest.DONE`.
        if (n == "UNSENT") return jsi::Value(0.0);
        if (n == "OPENED") return jsi::Value(1.0);
        if (n == "HEADERS_RECEIVED") return jsi::Value(2.0);
        if (n == "LOADING") return jsi::Value(3.0);
        if (n == "DONE") return jsi::Value(4.0);

        return jsi::Value::undefined();
    }

    void set(jsi::Runtime &rt,
             const jsi::PropNameID &name,
             const jsi::Value &value) override {
        std::string n = name.utf8(rt);

        std::shared_ptr<jsi::Function> *slot = nullptr;
        if (n == "onreadystatechange") slot = &_onreadystatechange;
        else if (n == "onload") slot = &_onload;
        else if (n == "onerror") slot = &_onerror;
        else if (n == "onabort") slot = &_onabort;
        else if (n == "ontimeout") slot = &_ontimeout;
        else if (n == "onloadend") slot = &_onloadend;

        if (slot != nullptr) {
            if (value.isObject() && value.getObject(rt).isFunction(rt)) {
                *slot = std::make_shared<jsi::Function>(
                    value.getObject(rt).getFunction(rt));
            } else if (value.isNull() || value.isUndefined()) {
                slot->reset();
            }
            return;
        }

        if (n == "responseType") {
            if (!value.isString()) return;
            std::string t = value.getString(rt).utf8(rt);
            // 'blob' is accepted but `response` returns null for it.
            if (t == "" || t == "text" || t == "json" ||
                t == "arraybuffer" || t == "blob") {
                _responseType = t;
            }
            return;
        }
        if (n == "timeout") {
            if (value.isNumber()) _timeoutMs = value.getNumber();
            return;
        }
        if (n == "withCredentials") {
            if (value.isBool()) _withCredentials = value.getBool();
            return;
        }
    }

    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
        std::vector<jsi::PropNameID> out;
        for (const char *n : {
                 "open", "send", "abort", "setRequestHeader",
                 "getResponseHeader", "getAllResponseHeaders", "overrideMimeType",
                 "readyState", "status", "statusText", "responseURL",
                 "responseType", "response", "responseText",
                 "timeout", "withCredentials",
                 "onreadystatechange", "onload", "onerror",
                 "onabort", "ontimeout", "onloadend",
                 "UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE",
             }) {
            out.push_back(jsi::PropNameID::forAscii(rt, n));
        }
        return out;
    }

private:
    RNWXHRHost(jsi::Runtime &rt, facebook::react::RNWJSQueue jsQueue)
        : _runtime(rt), _jsQueue(jsQueue) {}

    void resetForOpen() {
        // Stale completion will still fire but sees a bumped generation
        // and bails.
        [_task cancel];
        _task = nil;
        _taskGeneration++;
        _readyState = 1; // OPENED
        _status = 0;
        _statusText.clear();
        _responseURL.clear();
        _responseText.clear();
        _responseData = nil;
        _responseAB.reset();
        _requestHeaders.clear();
        _aborted = false;
    }

    void buildMethodHandles() {
        std::weak_ptr<RNWXHRHost> weakSelf = weak_from_this();
        jsi::Runtime &rt = _runtime;

        // `async` arg is ignored — NSURLSession is async-only on watchOS.
        _openFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "open"),
                /*paramCount=*/2,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *args,
                           size_t count) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self) return jsi::Value::undefined();
                    if (count < 2 || !args[0].isString() || !args[1].isString()) {
                        throw jsi::JSError(innerRt,
                            "XMLHttpRequest.open: method and url must be strings");
                    }
                    self->_method = args[0].getString(innerRt).utf8(innerRt);
                    self->_url = args[1].getString(innerRt).utf8(innerRt);
                    self->resetForOpen();
                    self->fireReadyStateChange();
                    return jsi::Value::undefined();
                }));

        _setReqHeaderFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "setRequestHeader"),
                /*paramCount=*/2,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *args,
                           size_t count) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self) return jsi::Value::undefined();
                    if (self->_readyState != 1) {
                        throw jsi::JSError(innerRt,
                            "XMLHttpRequest.setRequestHeader: state must be OPENED");
                    }
                    if (count < 2 || !args[0].isString() || !args[1].isString()) {
                        throw jsi::JSError(innerRt,
                            "XMLHttpRequest.setRequestHeader: name and value must be strings");
                    }
                    self->_requestHeaders.push_back({
                        args[0].getString(innerRt).utf8(innerRt),
                        args[1].getString(innerRt).utf8(innerRt),
                    });
                    return jsi::Value::undefined();
                }));

        _overrideMimeFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "overrideMimeType"),
                /*paramCount=*/1,
                [](jsi::Runtime &, const jsi::Value &,
                   const jsi::Value *, size_t) -> jsi::Value {
                    // whatwg-fetch calls this on the 'blob' path; ignored.
                    return jsi::Value::undefined();
                }));

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
                    if (self->_readyState != 1) {
                        throw jsi::JSError(innerRt,
                            "XMLHttpRequest.send: state must be OPENED");
                    }
                    NSData *body = nil;
                    if (count >= 1) {
                        const jsi::Value &v = args[0];
                        if (v.isString()) {
                            std::string s = v.getString(innerRt).utf8(innerRt);
                            body = [[NSData alloc] initWithBytes:s.data()
                                                          length:s.size()];
                        } else if (v.isObject() &&
                                   v.getObject(innerRt).isArrayBuffer(innerRt)) {
                            auto ab = v.getObject(innerRt).getArrayBuffer(innerRt);
                            body = [[NSData alloc] initWithBytes:ab.data(innerRt)
                                                          length:ab.size(innerRt)];
                        }
                        // null/undefined/other → no body. whatwg-fetch only
                        // ever sends string or ArrayBuffer.
                    }
                    self->kickOffRequest(body);
                    return jsi::Value::undefined();
                }));

        _abortFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "abort"),
                /*paramCount=*/0,
                [weakSelf](jsi::Runtime &, const jsi::Value &,
                           const jsi::Value *, size_t) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self) return jsi::Value::undefined();
                    if (self->_task == nil || self->_readyState == 4) {
                        return jsi::Value::undefined();
                    }
                    self->_aborted = true;
                    [self->_task cancel];
                    // Completion handler will see `_aborted` and fire
                    // onabort + onloadend on the JS queue.
                    return jsi::Value::undefined();
                }));

        _getRespHeaderFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "getResponseHeader"),
                /*paramCount=*/1,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *args,
                           size_t count) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self || count < 1 || !args[0].isString()) {
                        return jsi::Value::null();
                    }
                    if (self->_responseHeaders == nil) return jsi::Value::null();
                    std::string needle = args[0].getString(innerRt).utf8(innerRt);
                    NSString *needleNS = [[NSString alloc]
                        initWithUTF8String:needle.c_str()];
                    for (NSString *key in self->_responseHeaders) {
                        if ([key caseInsensitiveCompare:needleNS] == NSOrderedSame) {
                            NSString *val = self->_responseHeaders[key];
                            return jsi::String::createFromUtf8(
                                innerRt, [val UTF8String] ?: "");
                        }
                    }
                    return jsi::Value::null();
                }));

        _getAllRespHeadersFn = std::make_shared<jsi::Function>(
            jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forAscii(rt, "getAllResponseHeaders"),
                /*paramCount=*/0,
                [weakSelf](jsi::Runtime &innerRt,
                           const jsi::Value &,
                           const jsi::Value *, size_t) -> jsi::Value {
                    auto self = weakSelf.lock();
                    if (!self || self->_responseHeaders == nil) {
                        return jsi::String::createFromUtf8(innerRt, "");
                    }
                    std::string out;
                    for (NSString *key in self->_responseHeaders) {
                        appendHeaderLine(out, key, self->_responseHeaders[key]);
                    }
                    return jsi::String::createFromUtf8(innerRt, out);
                }));
    }

    // Caller is on the JS queue. Completion runs on the session's queue,
    // decodes the body there, then hops to JS to dispatch events.
    void kickOffRequest(NSData *body) {
        NSURL *parsed = [NSURL URLWithString:
            [[NSString alloc] initWithUTF8String:_url.c_str()]];
        if (parsed == nil) {
            // Synthesize an error so onerror/onloadend still fire.
            std::weak_ptr<RNWXHRHost> weakSelf = weak_from_this();
            _jsQueue.runAsync(^{
                auto self = weakSelf.lock();
                if (!self) return;
                self->_readyState = 4;
                self->fireReadyStateChange();
                self->fireEvent(self->_onerror, "error");
                self->fireEvent(self->_onloadend, "loadend");
            });
            return;
        }
        NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:parsed];
        req.HTTPMethod = [[NSString alloc] initWithUTF8String:_method.c_str()];
        for (auto &kv : _requestHeaders) {
            NSString *name = [[NSString alloc]
                initWithUTF8String:kv.first.c_str()];
            NSString *value = [[NSString alloc]
                initWithUTF8String:kv.second.c_str()];
            // addValue (not setValue): repeated names comma-join per XHR spec.
            [req addValue:value forHTTPHeaderField:name];
        }
        if (body != nil) req.HTTPBody = body;
        if (_timeoutMs > 0) req.timeoutInterval = _timeoutMs / 1000.0;

        std::weak_ptr<RNWXHRHost> weakSelf = weak_from_this();
        uint64_t generation = _taskGeneration;
        _task = [RNWSharedXHRSession() dataTaskWithRequest:req
            completionHandler:^(NSData *data, NSURLResponse *response,
                                NSError *error) {
                auto self = weakSelf.lock();
                if (!self) return;
                // Decode off the JS queue — strings can be MBs.
                NSString *textPayload = nil;
                if (error == nil && data != nil) {
                    textPayload = [[NSString alloc]
                        initWithData:data encoding:NSUTF8StringEncoding];
                    // Malformed UTF-8 → empty string rather than nil so the
                    // JSI string allocation doesn't choke. Realistically only
                    // happens for binary responses where the caller should
                    // be using responseType='arraybuffer' anyway.
                    if (textPayload == nil) textPayload = @"";
                }
                NSData *dataCopy = data;
                NSHTTPURLResponse *httpResp =
                    [response isKindOfClass:[NSHTTPURLResponse class]]
                        ? (NSHTTPURLResponse *)response : nil;
                self->_jsQueue.runAsync(^{
                    auto inner = weakSelf.lock();
                    if (!inner) return;
                    // Stale task — open() was called again after we kicked off,
                    // bumping the generation. Ignore this completion.
                    // Stale completion (open() bumped generation).
                    if (inner->_taskGeneration != generation) return;
                    inner->handleCompletion(error, httpResp, dataCopy, textPayload);
                });
            }];
        [_task resume];
    }

    void handleCompletion(NSError *error,
                          NSHTTPURLResponse *httpResp,
                          NSData *data,
                          NSString *textPayload) {
        if (error != nil) {
            _readyState = 4;
            fireReadyStateChange();
            if (_aborted || error.code == NSURLErrorCancelled) {
                fireEvent(_onabort, "abort");
            } else if (error.code == NSURLErrorTimedOut) {
                fireEvent(_ontimeout, "timeout");
            } else {
                fireEvent(_onerror, "error");
            }
            fireEvent(_onloadend, "loadend");
            _task = nil;
            return;
        }

        if (httpResp != nil) {
            _status = static_cast<int>(httpResp.statusCode);
            NSString *st = [NSHTTPURLResponse
                localizedStringForStatusCode:httpResp.statusCode];
            _statusText = st ? [st UTF8String] : "";
            _responseURL = httpResp.URL.absoluteString
                ? [httpResp.URL.absoluteString UTF8String] : "";
            _responseHeaders = httpResp.allHeaderFields;
        }
        _responseData = data;
        _responseText = textPayload ? [textPayload UTF8String] : "";

        // Spec requires HEADERS_RECEIVED → LOADING → DONE with a
        // readystatechange between each. axios reads intermediate states.
        _readyState = 2;
        fireReadyStateChange();
        _readyState = 3;
        fireReadyStateChange();
        _readyState = 4;
        fireReadyStateChange();
        fireEvent(_onload, "load");
        fireEvent(_onloadend, "loadend");
        _task = nil;
    }

    void fireReadyStateChange() {
        if (!_onreadystatechange) return;
        // Caller is on the JS queue (from open() or the runAsync hop in
        // the completion handler).
        try {
            jsi::Object evt(_runtime);
            evt.setProperty(_runtime, "type",
                jsi::String::createFromUtf8(_runtime, "readystatechange"));
            _onreadystatechange->call(_runtime, jsi::Value(_runtime, evt));
        } catch (const jsi::JSError &e) {
            NSLog(@"XHR onreadystatechange threw: %s", e.getMessage().c_str());
        } catch (...) {
            NSLog(@"XHR onreadystatechange threw: unknown");
        }
        // whatwg-fetch resolves its Promise in this handler. Hermes doesn't
        // auto-drain on Function::call, so without this the `.then(...)`
        // continuation never fires and `await fetch(...)` hangs.
        _runtime.drainMicrotasks();
    }

    void fireEvent(const std::shared_ptr<jsi::Function> &fn, const char *type) {
        if (!fn) return;
        try {
            jsi::Object evt(_runtime);
            evt.setProperty(_runtime, "type",
                jsi::String::createFromUtf8(_runtime, type));
            fn->call(_runtime, jsi::Value(_runtime, evt));
        } catch (const jsi::JSError &e) {
            NSLog(@"XHR %s handler threw: %s", type, e.getMessage().c_str());
        } catch (...) {
            NSLog(@"XHR %s handler threw: unknown", type);
        }
        _runtime.drainMicrotasks();
    }

    jsi::Runtime &_runtime;
    facebook::react::RNWJSQueue _jsQueue;

    std::string _method;
    std::string _url;
    std::vector<std::pair<std::string, std::string>> _requestHeaders;
    double _timeoutMs = 0;
    bool _withCredentials = false;

    // Generation lets a stale completion handler (task cancelled by a
    // subsequent open()) detect itself and bail.
    NSURLSessionDataTask *_task = nil;
    uint64_t _taskGeneration = 0;
    bool _aborted = false;

    int _readyState = 0;
    int _status = 0;
    std::string _statusText;
    std::string _responseURL;
    std::string _responseType;
    std::string _responseText;
    NSData *_responseData = nil;
    NSDictionary *_responseHeaders = nil;
    // Cached so `xhr.response` has stable identity across reads.
    std::shared_ptr<jsi::ArrayBuffer> _responseAB;

    // Cached so `xhr.send === xhr.send`.
    std::shared_ptr<jsi::Function> _openFn;
    std::shared_ptr<jsi::Function> _sendFn;
    std::shared_ptr<jsi::Function> _abortFn;
    std::shared_ptr<jsi::Function> _setReqHeaderFn;
    std::shared_ptr<jsi::Function> _getRespHeaderFn;
    std::shared_ptr<jsi::Function> _getAllRespHeadersFn;
    std::shared_ptr<jsi::Function> _overrideMimeFn;

    std::shared_ptr<jsi::Function> _onreadystatechange;
    std::shared_ptr<jsi::Function> _onload;
    std::shared_ptr<jsi::Function> _onerror;
    std::shared_ptr<jsi::Function> _onabort;
    std::shared_ptr<jsi::Function> _ontimeout;
    std::shared_ptr<jsi::Function> _onloadend;
};

} // namespace

void rnwInstallXHR(jsi::Runtime &rt,
                   facebook::react::RNWJSQueue jsQueue) {
    // Same `new`-host-function workaround as rnwInstallWebSocket.
    auto factory = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "__RNW_create_xhr"),
        /*paramCount=*/0,
        [jsQueue](jsi::Runtime &innerRt,
                  const jsi::Value &,
                  const jsi::Value *,
                  size_t) -> jsi::Value {
            auto host = RNWXHRHost::create(innerRt, jsQueue);
            return jsi::Object::createFromHostObject(innerRt, host);
        });
    rt.global().setProperty(rt, "__RNW_create_xhr", factory);

    auto buffer = std::make_shared<jsi::StringBuffer>(std::string(
        "(function() {"
        "  function XMLHttpRequest() {"
        "    return globalThis.__RNW_create_xhr();"
        "  }"
        "  XMLHttpRequest.UNSENT = 0;"
        "  XMLHttpRequest.OPENED = 1;"
        "  XMLHttpRequest.HEADERS_RECEIVED = 2;"
        "  XMLHttpRequest.LOADING = 3;"
        "  XMLHttpRequest.DONE = 4;"
        "  globalThis.XMLHttpRequest = XMLHttpRequest;"
        "})();"));
    rt.evaluateJavaScript(buffer, "<rnw-xhr-shim>");
}
