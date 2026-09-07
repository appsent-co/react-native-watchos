#pragma once

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <atomic>
#include <cstdio>
#include <dispatch/dispatch.h>
#import "RNWJSThread.h"
#include <memory>

namespace facebook::react {

// Scheduler around the dedicated thread that owns Hermes. Two flavors:
//   * `runAsync` / `runSync` — raw transport, no microtask drain.
//   * `runOnJS*` / `invokeOnJS` — call into the runtime AND drain the Hermes
//     microtask queue after the block returns. Use this anywhere a callback
//     talks to the runtime. Hermes runs with `withMicrotaskQueue(true)`, so
//     Promise/await/queueMicrotask continuations sit forever without a drain.
//
// Sync calls already on this thread run inline to avoid self-deadlock.
//
// Lifetime: this struct is copied by value into every host that calls back
// into JS, and those hosts outlive the runtime on a Fast Refresh full reload.
// The runtime pointer therefore lives in one cell shared by every copy, and
// every hop re-reads it inside the dispatched block: the host clears the cell
// on the JS queue ahead of destroying the runtime, so a block queued behind
// the teardown no-ops instead of touching freed memory.
struct RNWJSQueue {
  RNWJSThread *thread;
  // Settable post-construction: the runtime is built ON the queue, after
  // this struct exists. Null before installation (and again after
  // `invalidate()`) → all `*OnJS` helpers no-op.
  std::shared_ptr<std::atomic<jsi::Runtime*>> runtimeCell =
      std::make_shared<std::atomic<jsi::Runtime*>>(nullptr);

  void setRuntime(jsi::Runtime* rt) const noexcept { runtimeCell->store(rt); }
  // Call on the JS queue, before the runtime is destroyed.
  void invalidate() const noexcept { runtimeCell->store(nullptr); }
  jsi::Runtime* runtime() const noexcept { return runtimeCell->load(); }

  bool isCurrent() const noexcept {
    return [thread isCurrent];
  }

  void runAsync(dispatch_block_t block) const noexcept {
    [thread enqueue:block];
  }

  // Re-entrant safe.
  void runSync(dispatch_block_t block) const {
    if (isCurrent()) {
      block();
    } else {
      [thread runSync:block];
    }
  }

  void runOnJS(void (^block)(jsi::Runtime& rt)) const noexcept {
    if (block == nil || runtime() == nullptr) return;
    auto cell = runtimeCell;
    runAsync(^{
      jsi::Runtime* rt = cell->load();
      if (rt == nullptr) return;
      block(*rt);
      rt->drainMicrotasks();
    });
  }

  // Backs setTimeout.
  void runOnJSAfter(int64_t delayNs,
                    void (^block)(jsi::Runtime& rt)) const noexcept {
    if (block == nil || runtime() == nullptr) return;
    auto target = *this;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, delayNs),
                   dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
      target.runOnJS(block);
    });
  }

  // Re-entrant from the JS queue runs inline.
  void runOnJSSync(void (^block)(jsi::Runtime& rt)) const {
    if (block == nil || runtime() == nullptr) return;
    if (isCurrent()) {
      invokeOnJS(block);
    } else {
      auto cell = runtimeCell;
      runSync(^{
        jsi::Runtime* rt = cell->load();
        if (rt == nullptr) return;
        block(*rt);
        rt->drainMicrotasks();
      });
    }
  }

  // Caller is already on the JS thread — invoke inline and drain, no re-dispatch.
  void invokeOnJS(void (^block)(jsi::Runtime& rt)) const noexcept {
    jsi::Runtime* rt = runtime();
    if (block == nil || rt == nullptr) return;
    block(*rt);
    rt->drainMicrotasks();
  }

  // Destroys `owner` on the JS queue, and only while the runtime is still
  // there. A native host whose last reference is dropped off the JS queue
  // (a URLSession completion outliving its JS wrapper) hands its JSI
  // handles here: releasing a handle decrements a counter in the runtime's
  // handle table, which is freed with the runtime, so a handle that outlives
  // the runtime is leaked on purpose.
  void destroyOnJS(std::shared_ptr<void> owner) const noexcept {
    if (!owner) return;
    auto cell = runtimeCell;
    auto* box = new std::shared_ptr<void>(std::move(owner));
    runAsync(^{
      if (cell->load() != nullptr) {
        delete box;
      }
    });
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
