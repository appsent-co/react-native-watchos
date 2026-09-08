// Standalone watchOS simulator executable; links the same JSI/Hermes runtime
// and native installers as the host library, without starting an application.
#include <hermes/hermes.h>
#include "RNWWebSocket.h"
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
        )JS";
        rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(script), "native-runtime.integration.js");
        assert(source[0] == 1 && storage->data()[0] == 42);
        jsQueue.invalidate();
    }
    });
}
