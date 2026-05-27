// watchOS fork of `<React/RCTLog.h>`. Fans the RCT log macros into
// `NSLog` — no Metro-side log channel on this slice.

#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

#ifndef RCTLog
#define RCTLog(...) NSLog(__VA_ARGS__)
#endif

#ifndef RCTLogTrace
#define RCTLogTrace(...) NSLog(__VA_ARGS__)
#endif

#ifndef RCTLogInfo
#define RCTLogInfo(...) NSLog(__VA_ARGS__)
#endif

#ifndef RCTLogWarn
#define RCTLogWarn(...) NSLog(__VA_ARGS__)
#endif

#ifndef RCTLogError
#define RCTLogError(...) NSLog(__VA_ARGS__)
#endif
