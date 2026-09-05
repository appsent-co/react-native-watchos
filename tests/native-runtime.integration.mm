// Standalone watchOS simulator executable; links the same JSI/Hermes runtime
// and native installers as the host library, without starting an application.
#include <hermes/hermes.h>
#include "RNWCrypto.h"
#include "RNWWebSocket.h"
#include "RNWTextDecoder.h"
#include "RNWNSDataBuffer.h"
#include <cassert>

int main() {
    static const char queueKey = 0;
    dispatch_queue_t queue = dispatch_queue_create("rnw.integration", DISPATCH_QUEUE_SERIAL);
    dispatch_queue_set_specific(queue, &queueKey, (void *)&queueKey, nullptr);
    facebook::react::RNWJSQueue jsQueue{queue, &queueKey};
    dispatch_sync(queue, ^{
    @autoreleasepool {
        auto runtime = facebook::hermes::makeHermesRuntime();
        auto &rt = *runtime;
        jsQueue.setRuntime(&rt);
        rnwInstallWebSocket(rt, jsQueue);
        rnwInstallCrypto(rt);
        rnwInstallTextDecoder(rt);
        static const uint8_t source[] = {1, 2, 3};
        NSData *data = [NSData dataWithBytesNoCopy:const_cast<uint8_t *>(source)
                                          length:sizeof(source) freeWhenDone:NO];
        auto storage = std::make_shared<RNWNSDataBuffer>(data);
        rt.global().setProperty(rt, "ownedBuffer", facebook::jsi::ArrayBuffer(rt, storage));
        const char *script = R"JS(
            function assert(condition) { if (!condition) throw new Error('assertion failed'); }
            function throws(fn) { var caught = false; try { fn(); } catch (_) { caught = true; } assert(caught); }
            new Uint8Array(ownedBuffer)[0] = 42;
            assert(new Uint8Array(ownedBuffer)[0] === 42);
            for (var pair of [
                ['WS://LOCALHOST:80', 'ws://localhost/'],
                ['HTTPS://LOCALHOST:443?x=1', 'wss://localhost/?x=1'],
                ['ws://localhost:12345/echo', 'ws://localhost:12345/echo']
            ]) {
                var ws = new WebSocket(pair[0], ['chat', 'CHAT']);
                assert(ws.url === pair[1]);
                ws.close();
                ws._state.native.dispose();
            }
            for (var badURL of ['ftp://localhost', 'ws://localhost/#', '/relative', 'ws://', 'ws://localhost:65536']) {
                throws(() => new WebSocket(badURL));
            }
            var replacement = '\uFFFD';
            for (var prefix of [[0xe0, 0x80], [0xed, 0xa0], [0xf0, 0x80], [0xf4, 0x90]]) {
                throws(() => new TextDecoder('utf8', {fatal:true}).decode(new Uint8Array(prefix), {stream:true}));
                assert(new TextDecoder().decode(new Uint8Array(prefix), {stream:true}) === replacement + replacement);
            }
            // A failing streaming decode drops its own bytes but keeps BOM
            // state from an earlier successful call; a failing first call
            // cannot establish that state.
            var fatal = new TextDecoder('utf8', {fatal:true});
            assert(fatal.decode(new Uint8Array([65]), {stream:true}) === 'A');
            throws(() => fatal.decode(new Uint8Array([0xff]), {stream:true}));
            assert(fatal.decode(new Uint8Array([0xef, 0xbb, 0xbf]), {stream:true}) === '\uFEFF');
            fatal = new TextDecoder('utf8', {fatal:true});
            throws(() => fatal.decode(new Uint8Array([65, 0xff]), {stream:true}));
            assert(fatal.decode(new Uint8Array([0xef, 0xbb, 0xbf]), {stream:true}) === '');
            var decoder = new TextDecoder();
            assert(decoder.decode(new Uint8Array([0xef]), {stream:true}) === '');
            assert(decoder.decode(new Uint8Array([0xbb]), {stream:true}) === '');
            assert(decoder.decode(new Uint8Array([0xbf, 65]), {stream:true}) === 'A');
            assert(decoder.decode(new Uint8Array([0xef, 0xbb, 0xbf])) === '\uFEFF');
            assert(decoder.decode(new Uint8Array([0xef, 0xbb, 0xbf, 66])) === 'B');
            assert(new TextDecoder('utf8', {ignoreBOM:true}).decode(new Uint8Array([0xef,0xbb,0xbf])) === '\uFEFF');
            var view = new DataView(new Uint8Array([88,65,66,88]).buffer, 1, 2);
            assert(decoder.decode(view) === 'AB');
            var rawDecode = __RNW_createUtf8Decoder(false, false);
            for (var bad of [NaN, Infinity, -Infinity, -1, 0.5, 18446744073709551616]) {
                throws(() => rawDecode(new ArrayBuffer(8), bad, 0, false));
                throws(() => rawDecode(new ArrayBuffer(8), 0, bad, false));
                throws(() => __RNW_fillRandom({buffer:new ArrayBuffer(8), byteOffset:bad, byteLength:0}));
                throws(() => __RNW_fillRandom({buffer:new ArrayBuffer(8), byteOffset:0, byteLength:bad}));
            }
            var random = new Uint8Array(8);
            random.fill(123);
            __RNW_fillRandom(random.subarray(2, 6));
            assert(random[0] === 123 && random[1] === 123 && random[6] === 123 && random[7] === 123);
            __RNW_fillRandom(new Uint8Array(0));
            assert(rawDecode(new ArrayBuffer(0), 0, 0, false) === '');
        )JS";
        rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(script), "native-runtime.integration.js");
        assert(source[0] == 1 && storage->data()[0] == 42);
        jsQueue.invalidate();
    }
    });
}
