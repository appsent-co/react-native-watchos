#pragma once
#import <Foundation/Foundation.h>

// One sleeping run loop per Hermes host. All runtime access, including
// construction and destruction, stays on this thread.
@interface RNWJSThread : NSObject
- (BOOL)isCurrent;
- (BOOL)enqueue:(dispatch_block_t)block;
- (void)runSync:(dispatch_block_t)block;
// Reject new work, finish accepted work, and stop. Safe from the JS thread too.
- (void)stop;
@end
