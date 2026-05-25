#pragma once

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <atomic>
#include <cstdio>
#include <dispatch/dispatch.h>

namespace facebook::react {

// Scheduler around the serial GCD queue that owns Hermes. Two flavors:
//   * `runAsync` / `runSync` — raw transport, no microtask drain.
//   * `runOnJS*` / `invokeOnJS` — call into the runtime AND drain the Hermes
//     microtask queue after the block returns. Use this anywhere a callback
//     talks to the runtime. Hermes runs with `withMicrotaskQueue(true)`, so
//     Promise/await/queueMicrotask continuations sit forever without a drain.
//
// The queue is tagged with `dispatch_queue_set_specific(queue, key, …)` so
// `dispatch_get_specific(key)` answers "am I on the JS queue?" — the sync
// variants use this to avoid self-deadlock when called re-entrantly.
struct RNWJSQueue {
  dispatch_queue_t queue;
  const void* key;
  // Settable post-construction: the runtime is built ON the queue, after
  // this struct exists. Null before installation → all `*OnJS` helpers no-op.
  jsi::Runtime* runtime = nullptr;

  bool isCurrent() const noexcept {
    return dispatch_get_specific(key) != nullptr;
  }

  void runAsync(dispatch_block_t block) const noexcept {
    dispatch_async(queue, block);
  }

  // Re-entrant safe.
  void runSync(dispatch_block_t block) const {
    if (isCurrent()) {
      block();
    } else {
      dispatch_sync(queue, block);
    }
  }

  void runOnJS(void (^block)(jsi::Runtime& rt)) const noexcept {
    jsi::Runtime* rt = runtime;
    if (block == nil || rt == nullptr) return;
    dispatch_async(queue, ^{
      block(*rt);
      rt->drainMicrotasks();
    });
  }

  // Backs setTimeout.
  void runOnJSAfter(int64_t delayNs,
                    void (^block)(jsi::Runtime& rt)) const noexcept {
    jsi::Runtime* rt = runtime;
    if (block == nil || rt == nullptr) return;
    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, delayNs),
        queue,
        ^{
          block(*rt);
          rt->drainMicrotasks();
        });
  }

  // Re-entrant from the JS queue runs inline.
  void runOnJSSync(void (^block)(jsi::Runtime& rt)) const {
    jsi::Runtime* rt = runtime;
    if (block == nil || rt == nullptr) return;
    if (isCurrent()) {
      block(*rt);
      rt->drainMicrotasks();
    } else {
      dispatch_sync(queue, ^{
        block(*rt);
        rt->drainMicrotasks();
      });
    }
  }

  // Caller is already on the JS queue (e.g. a GCD dispatch source firing on
  // this queue) — invoke inline and drain, no re-dispatch.
  void invokeOnJS(void (^block)(jsi::Runtime& rt)) const noexcept {
    jsi::Runtime* rt = runtime;
    if (block == nil || rt == nullptr) return;
    block(*rt);
    rt->drainMicrotasks();
  }
};

// JS-side CallInvoker. Routes through `runOnJS*` so TurboModule callbacks
// drain microtasks — without that, a TurboModule resolving a Promise would
// queue its `.then` continuation and never run it.
class RNWJSQueueCallInvoker : public CallInvoker {
 public:
  explicit RNWJSQueueCallInvoker(RNWJSQueue jsQueue) noexcept
      : jsQueue_(jsQueue) {}

  void invokeAsync(CallFunc&& func) noexcept override {
    auto shared = std::make_shared<CallFunc>(std::move(func));
    jsQueue_.runOnJS(^(jsi::Runtime& rt) {
      // Uncaught C++ exceptions inside `dispatch_async` call std::terminate.
      // Surface them via stderr instead (Xcode + eventually Metro).
      try {
        (*shared)(rt);
      } catch (const jsi::JSError& e) {
        fprintf(stderr, "[RNWJSQueueCallInvoker] JS error: %s\n",
                e.getMessage().c_str());
      } catch (const std::exception& e) {
        fprintf(stderr, "[RNWJSQueueCallInvoker] exception: %s\n", e.what());
      } catch (...) {
        fprintf(stderr, "[RNWJSQueueCallInvoker] unknown C++ exception\n");
      }
    });
  }

  void invokeSync(CallFunc&& func) override {
    auto shared = std::make_shared<CallFunc>(std::move(func));
    jsQueue_.runOnJSSync(^(jsi::Runtime& rt) {
      // Sync variant rethrows after logging so the caller still sees it.
      try {
        (*shared)(rt);
      } catch (const jsi::JSError& e) {
        fprintf(stderr, "[RNWJSQueueCallInvoker] sync JS error: %s\n",
                e.getMessage().c_str());
        throw;
      }
    });
  }

  using CallInvoker::invokeAsync;
  using CallInvoker::invokeSync;

 private:
  RNWJSQueue jsQueue_;
};

// Native-side method invoker. Serial (per RN's method-queue contract) so a
// slow native call doesn't stall the JS queue.
class RNWSerialNativeMethodCallInvoker : public NativeMethodCallInvoker {
 public:
  RNWSerialNativeMethodCallInvoker() {
    queue_ = dispatch_queue_create(
        "co.appsent.reactnativewatchos.tm-native",
        DISPATCH_QUEUE_SERIAL);
  }

  void invokeAsync(
      const std::string& /*methodName*/,
      NativeMethodCallFunc&& func) noexcept override {
    auto shared = std::make_shared<NativeMethodCallFunc>(std::move(func));
    dispatch_async(queue_, ^{
      (*shared)();
    });
  }

  void invokeSync(
      const std::string& /*methodName*/,
      NativeMethodCallFunc&& func) override {
    // Caller is the JS queue (different serial queue) so dispatch_sync is
    // safe — and main-thread UI keeps animating while JS blocks.
    __block NativeMethodCallFunc f = std::move(func);
    dispatch_sync(queue_, ^{
      f();
    });
  }

 private:
  dispatch_queue_t queue_;
};

}  // namespace facebook::react
