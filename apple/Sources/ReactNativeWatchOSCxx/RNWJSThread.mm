#import "RNWJSThread.h"
#include <atomic>
#include <condition_variable>
#include <future>
#include <memory>
#include <mutex>
#include <pthread.h>

namespace {
struct RNWThreadState {
  std::mutex mutex;
  std::condition_variable changed;
  CFRunLoopRef runLoop = nullptr;
  bool accepting = false;
  bool finished = false;
  std::atomic<bool> stopping{false};
  ~RNWThreadState() { if (runLoop) CFRelease(runLoop); }
};
}

@implementation RNWJSThread {
  NSThread *_thread;
  std::shared_ptr<RNWThreadState> _state;
}

- (instancetype)init {
  if ((self = [super init])) {
    auto state = std::make_shared<RNWThreadState>();
    _state = state;
    // Capture state, not self: the thread must not keep its owner alive.
    _thread = [[NSThread alloc] initWithBlock:^{
      @autoreleasepool {
        pthread_setname_np("com.facebook.react.runtime.JavaScript");
        CFRunLoopRef loop = CFRunLoopGetCurrent();
        CFRunLoopSourceContext context = {};
        CFRunLoopSourceRef source = CFRunLoopSourceCreate(nullptr, 0, &context);
        CFRunLoopAddSource(loop, source, kCFRunLoopDefaultMode);
        {
          std::lock_guard<std::mutex> lock(state->mutex);
          state->runLoop = (CFRunLoopRef)CFRetain(loop);
          state->accepting = true;
        }
        state->changed.notify_all();
        // A source keeps the run loop asleep until work arrives; no polling.
        CFRunLoopRun();
        CFRunLoopRemoveSource(loop, source, kCFRunLoopDefaultMode);
        CFRelease(source);
      }
      {
        std::lock_guard<std::mutex> lock(state->mutex);
        state->finished = true;
      }
      state->changed.notify_all();
    }];
    _thread.name = @"com.facebook.react.runtime.JavaScript";
    _thread.qualityOfService = NSQualityOfServiceUserInitiated;
    [_thread start];
    std::unique_lock<std::mutex> lock(state->mutex);
    state->changed.wait(lock, [&] { return state->runLoop != nullptr; });
  }
  return self;
}

- (BOOL)isCurrent { return [NSThread currentThread] == _thread; }

- (BOOL)enqueue:(dispatch_block_t)block {
  auto state = _state;
  std::lock_guard<std::mutex> lock(state->mutex);
  if (!state->accepting) return NO;
  CFRunLoopPerformBlock(state->runLoop, kCFRunLoopDefaultMode, ^{
    @autoreleasepool { block(); }
    // A callback may pump a nested run loop (Expo execute/await does this).
    // Propagate shutdown as each nested callback returns to the outer loop.
    if (state->stopping.load()) CFRunLoopStop(CFRunLoopGetCurrent());
  });
  CFRunLoopWakeUp(state->runLoop);
  return YES;
}

- (void)runSync:(dispatch_block_t)block {
  if ([self isCurrent]) {
    block();
    return;
  }
  auto completion = std::make_shared<std::promise<void>>();
  auto future = completion->get_future();
  if ([self enqueue:^{
    try {
      block();
      completion->set_value();
    } catch (...) {
      completion->set_exception(std::current_exception());
    }
  }]) future.get();
}

- (void)stop {
  auto state = _state;
  if (!state) return;
  std::unique_lock<std::mutex> lock(state->mutex);
  if (state->accepting) {
    state->accepting = false;
    CFRunLoopRef loop = state->runLoop;
    CFRunLoopPerformBlock(loop, kCFRunLoopDefaultMode, ^{
      state->stopping.store(true);
      CFRunLoopStop(loop);
    });
    CFRunLoopWakeUp(loop);
  }
  if (![self isCurrent]) state->changed.wait(lock, [&] { return state->finished; });
}

- (void)dealloc { [self stop]; }
@end
