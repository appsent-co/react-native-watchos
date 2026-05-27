// Shared macros. Path matches upstream so files vendored from
// `react-native/React/Base/` resolve here on the watchOS slice.

#pragma once

#ifdef __cplusplus
#define RCT_EXTERN extern "C" __attribute__((visibility("default")))
#else
#define RCT_EXTERN extern __attribute__((visibility("default")))
#endif

#ifndef RCT_DEBUG
#define RCT_DEBUG 0
#endif

#define RCT_CONCAT2(A, B) A##B
#define RCT_CONCAT(A, B) RCT_CONCAT2(A, B)
