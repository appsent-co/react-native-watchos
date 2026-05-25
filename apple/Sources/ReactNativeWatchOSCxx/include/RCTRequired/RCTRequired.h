// Stub of `<RCTRequired/RCTRequired.h>` for watchOS. `@react-native/codegen`
// `#import`s this in every generated `Native<Foo>Spec.h`, regardless of
// whether the spec actually uses `RCTRequired<T>` (it's used to enforce
// required fields on typed-object args). v1 doesn't support typed-object
// arg specs, so no maintainer code touches the `RCTRequired<T>` template
// — having the header exist is enough to satisfy the include.
//
// Specs that DO use struct args will fail to compile with an undeclared
// identifier at the use site, which surfaces the unsupported feature
// clearly. If/when we add typed-object support, vendor upstream's
// `RCTRequired.h` (header-only template, no UIKit) into this slot.

#pragma once
