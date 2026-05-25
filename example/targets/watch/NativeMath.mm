#import <ReactNativeWatchOSCxx/RNWTurboModuleRegistry+Cxx.h>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <jsi/jsi.h>

// Pure-C++ TurboModule mirroring what `@react-native/codegen` would emit
// for a `Native<Math>.ts` spec exposing one synchronous method
// `add(a, b): number`. The hand-written methodMap_ exercises the binding
// without standing up codegen for the demo; a real module replaces this
// class with codegen output.
namespace {

class NativeMathModule : public facebook::react::TurboModule {
 public:
  NativeMathModule(
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
      : facebook::react::TurboModule("Math", std::move(jsInvoker)) {
    methodMap_["add"] = MethodMetadata{2, addInvoker};
  }

 private:
  // The static-function-pointer convention is what codegen emits — each
  // method gets one of these so the base class can dispatch without a
  // virtual call. `module` is `*this` (a `NativeMathModule&`) re-cast to
  // the abstract base, kept for symmetry with multi-instance modules.
  static facebook::jsi::Value addInvoker(
      facebook::jsi::Runtime& rt,
      facebook::react::TurboModule& /*module*/,
      const facebook::jsi::Value* args,
      size_t count) {
    double a = count > 0 && args[0].isNumber() ? args[0].getNumber() : 0;
    double b = count > 1 && args[1].isNumber() ? args[1].getNumber() : 0;
    return facebook::jsi::Value(a + b);
  }
};

}  // namespace

RNW_EXPORT_CXX_MODULE(Math, [](std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
    return std::make_shared<NativeMathModule>(std::move(jsInvoker));
});
