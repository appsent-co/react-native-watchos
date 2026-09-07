#import "RNWJSThread.h"
#include <atomic>
#include <cassert>
#include <future>
#include <stdexcept>
#include <thread>
#include <vector>
#include <pthread.h>

int main() {
  @autoreleasepool {
    RNWJSThread *thread = [RNWJSThread new];
    RNWJSThread *other = [RNWJSThread new];
    __block uint64_t threadID = 0;
    __block int completed = 0;
    [thread runSync:^{
      assert([thread isCurrent] && ![other isCurrent]);
      assert([[NSThread currentThread].name isEqualToString:@"com.facebook.react.runtime.JavaScript"]);
      pthread_threadid_np(nullptr, &threadID);
      [thread runSync:^{ ++completed; }];
    }];
    for (int i = 0; i < 100; ++i) {
      assert([thread enqueue:^{
        uint64_t current;
        pthread_threadid_np(nullptr, &current);
        assert(current == threadID);
        assert(completed == i + 1);
        ++completed;
      }]);
    }
    // Nested run-loop pumping must allow an async continuation on this thread.
    [thread runSync:^{
      __block bool resumed = false;
      [thread enqueue:^{ resumed = true; }];
      while (!resumed) CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1, true);
    }];
    bool caught = false;
    try { [thread runSync:^{ throw std::runtime_error("sync failure"); }]; }
    catch (const std::runtime_error &) { caught = true; }
    assert(caught);
    [thread stop];
    assert(completed == 101);
    assert(![thread enqueue:^{ abort(); }]);
    [thread runSync:^{ abort(); }];
    [thread stop]; // idempotent
    [other runSync:^{ assert([other isCurrent]); }];
    [other runSync:^{ [other stop]; }]; // never join itself
    [other stop];

    RNWJSThread *nested = [RNWJSThread new];
    [nested runSync:^{
      __block bool stopped = false;
      [nested enqueue:^{ [nested stop]; stopped = true; }];
      while (!stopped) CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1, true);
    }];
    [nested stop]; // shutdown from a nested run loop must stop the outer loop too

    // Race concurrent producers with shutdown: every accepted task finishes.
    for (int round = 0; round < 20; ++round) {
      RNWJSThread *worker = [RNWJSThread new];
      auto accepted = std::make_shared<std::atomic<int>>(0);
      auto ran = std::make_shared<std::atomic<int>>(0);
      std::vector<std::thread> producers;
      for (int p = 0; p < 4; ++p) producers.emplace_back([=] {
        @autoreleasepool {
          for (int i = 0; i < 100; ++i)
            if ([worker enqueue:^{ ++*ran; }]) ++*accepted;
        }
      });
      [worker stop];
      for (auto &producer : producers) producer.join();
      assert(*accepted == *ran);
    }
  }
}
