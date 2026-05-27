// Installs JSI host functions consumed by `src/reactNativeShim.ts`:
//
//   __rnwInvokeNativeModuleMethod(moduleName, methodName, [...args])
//   __rnwGetNativeModuleConstants(moduleName)
//
// Routes through `ObjCTurboModule::invokeObjCMethod` so we reuse the
// codegen path's JSI↔ObjC conversion + sync/promise/void dispatch.

#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

#include <memory>

namespace facebook::react {

void rnwInstallNativeModulesProxy(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::shared_ptr<NativeMethodCallInvoker> nativeInvoker);

}  // namespace facebook::react
