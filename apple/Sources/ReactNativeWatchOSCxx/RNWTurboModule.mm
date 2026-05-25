// watchOS fork of `<ReactCommon/RCTTurboModule.mm>`. Logic changes are
// confined to `setInvocationArg` (dropped RCTConvert/RCTCxxConvert paths);
// see the diff list below for the full surgical-edit set.

#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTBridgeModule.h>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <ReactCommon/TurboModulePerfLogger.h>
#include <react/bridging/Bridging.h>
#include <react/bridging/CallbackWrapper.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>

#include <glog/logging.h>

#import <objc/message.h>
#import <objc/runtime.h>
#include <atomic>
#include <optional>
#include <sstream>
#include <vector>

// Diff vs upstream (RCTTurboModule.mm):
//   - Removed: RCTBridge.h (UIKit chain), RCTConvert.h / RCTCxxConvert.h /
//     RCTManagedPointer.h (UI types + struct conversion not supported here),
//     RCTModuleMethod.h, RCTUtils.h, cxxreact/TraceSection.h.
//   - RCTLogError → NSLog; RCTJSErrorFromCodeMessageAndNSError inlined.
//   - Deleted: RCTInteropTurboModule, getArgumentTypeName /
//     methodArgumentTypeNames_, setMethodArgConversionSelector /
//     methodArgConversionSelectors_, and the RCTConvert/RCTCxxConvert
//     branches in setInvocationArg.
//   - Type names left as upstream RCT* (iOS + watchOS are separate
//     targets — never linked together).

using namespace facebook;
using namespace facebook::react;
using namespace facebook::react::TurboModuleConvertUtils;

static int32_t getUniqueId()
{
    static int32_t counter = 0;
    return counter++;
}

// Inlined from `RCTUtils.mm` — mirrors RN's promise-rejection schema.
static NSDictionary *RNWJSErrorFromCodeMessageAndNSError(
    NSString *code, NSString *message, NSError *error)
{
    NSString *errorMessage;
    NSArray<NSString *> *stackTrace = [NSThread callStackSymbols];
    NSMutableDictionary *errorInfo = [NSMutableDictionary dictionaryWithObject:stackTrace forKey:@"nativeStackIOS"];

    if (error) {
        errorMessage = error.localizedDescription ?: @"Unknown error from a native module";
        errorInfo[@"domain"] = error.domain ?: @"RNWErrorDomain";
        if (error.userInfo) {
            NSMutableDictionary<NSString *, id> *userInfo = [[NSMutableDictionary alloc] initWithCapacity:error.userInfo.count];
            [error.userInfo enumerateKeysAndObjectsUsingBlock:^(NSString *key, id obj, BOOL *stop) {
                if ([NSJSONSerialization isValidJSONObject:@{key : obj}]) {
                    userInfo[key] = obj;
                } else {
                    userInfo[key] = [obj description];
                }
            }];
            errorInfo[@"userInfo"] = userInfo;
        }
    } else {
        errorMessage = @"Unknown error from a native module";
        errorInfo[@"domain"] = @"RNWErrorDomain";
    }
    errorInfo[@"code"] = code ?: @"EUNSPECIFIED";
    errorInfo[@"userInfo"] = errorInfo[@"userInfo"] ?: [NSNull null];

    // Allow for explicit overriding of the error message.
    errorMessage = message ?: errorMessage;
    errorInfo[@"message"] = errorMessage;

    return errorInfo;
}

namespace facebook::react {

namespace TurboModuleConvertUtils {

static jsi::Value convertNSNumberToJSIBoolean(jsi::Runtime &runtime, NSNumber *value)
{
    return jsi::Value((bool)[value boolValue]);
}

static jsi::Value convertNSNumberToJSINumber(jsi::Runtime &runtime, NSNumber *value)
{
    return jsi::Value([value doubleValue]);
}

static jsi::String convertNSStringToJSIString(jsi::Runtime &runtime, NSString *value)
{
    return jsi::String::createFromUtf8(runtime, [value UTF8String] ? [value UTF8String] : "");
}

static jsi::Object convertNSDictionaryToJSIObject(jsi::Runtime &runtime, NSDictionary *value)
{
    jsi::Object result = jsi::Object(runtime);
    for (NSString *k in value) {
        result.setProperty(runtime, convertNSStringToJSIString(runtime, k), convertObjCObjectToJSIValue(runtime, value[k]));
    }
    return result;
}

static jsi::Array convertNSArrayToJSIArray(jsi::Runtime &runtime, NSArray *value)
{
    jsi::Array result = jsi::Array(runtime, value.count);
    for (size_t i = 0; i < value.count; i++) {
        result.setValueAtIndex(runtime, i, convertObjCObjectToJSIValue(runtime, value[i]));
    }
    return result;
}

static std::vector<jsi::Value> convertNSArrayToStdVector(jsi::Runtime &runtime, NSArray *value)
{
    std::vector<jsi::Value> result;
    for (size_t i = 0; i < value.count; i++) {
        result.emplace_back(convertObjCObjectToJSIValue(runtime, value[i]));
    }
    return result;
}

jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value)
{
    if ([value isKindOfClass:[NSString class]]) {
        return convertNSStringToJSIString(runtime, (NSString *)value);
    } else if ([value isKindOfClass:[NSNumber class]]) {
        if ([value isKindOfClass:[@YES class]]) {
            return convertNSNumberToJSIBoolean(runtime, (NSNumber *)value);
        }
        return convertNSNumberToJSINumber(runtime, (NSNumber *)value);
    } else if ([value isKindOfClass:[NSDictionary class]]) {
        return convertNSDictionaryToJSIObject(runtime, (NSDictionary *)value);
    } else if ([value isKindOfClass:[NSArray class]]) {
        return convertNSArrayToJSIArray(runtime, (NSArray *)value);
    } else if (value == (id)kCFNull) {
        return jsi::Value::null();
    }
    return jsi::Value::undefined();
}

static NSString *convertJSIStringToNSString(jsi::Runtime &runtime, const jsi::String &value)
{
    return [NSString stringWithUTF8String:value.utf8(runtime).c_str()];
}

static NSArray *convertJSIArrayToNSArray(
    jsi::Runtime &runtime,
    const jsi::Array &value,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    BOOL useNSNull)
{
    size_t size = value.size(runtime);
    NSMutableArray *result = [NSMutableArray new];
    for (size_t i = 0; i < size; i++) {
        id convertedObject = convertJSIValueToObjCObject(runtime, value.getValueAtIndex(runtime, i), jsInvoker, useNSNull);
        [result addObject:convertedObject ? convertedObject : (id)kCFNull];
    }
    return result;
}

static NSDictionary *convertJSIObjectToNSDictionary(
    jsi::Runtime &runtime,
    const jsi::Object &value,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    BOOL useNSNull)
{
    jsi::Array propertyNames = value.getPropertyNames(runtime);
    size_t size = propertyNames.size(runtime);
    NSMutableDictionary *result = [NSMutableDictionary new];
    for (size_t i = 0; i < size; i++) {
        jsi::String name = propertyNames.getValueAtIndex(runtime, i).getString(runtime);
        NSString *k = convertJSIStringToNSString(runtime, name);
        id v = convertJSIValueToObjCObject(runtime, value.getProperty(runtime, name), jsInvoker, useNSNull);
        if (v) {
            result[k] = v;
        }
    }
    return result;
}

static RCTResponseSenderBlock
convertJSIFunctionToCallback(jsi::Runtime &rt, jsi::Function &&function, const std::shared_ptr<CallInvoker> &jsInvoker)
{
    __block std::optional<AsyncCallback<>> callback({rt, std::move(function), jsInvoker});
    return ^(NSArray *args) {
        if (!callback) {
            LOG(FATAL) << "Callback arg cannot be called more than once";
            return;
        }

        callback->call([args](jsi::Runtime &rt, jsi::Function &jsFunction) {
            auto jsArgs = convertNSArrayToStdVector(rt, args);
            jsFunction.call(rt, (const jsi::Value *)jsArgs.data(), jsArgs.size());
        });
        callback = std::nullopt;
    };
}

id convertJSIValueToObjCObject(
    jsi::Runtime &runtime,
    const jsi::Value &value,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    BOOL useNSNull)
{
    if (value.isUndefined() || (value.isNull() && !useNSNull)) {
        return nil;
    }
    if (value.isNull() && useNSNull) {
        return (id)kCFNull;
    }
    if (value.isBool()) {
        return @(value.getBool());
    }
    if (value.isNumber()) {
        return @(value.getNumber());
    }
    if (value.isString()) {
        return convertJSIStringToNSString(runtime, value.getString(runtime));
    }
    if (value.isObject()) {
        jsi::Object o = value.getObject(runtime);
        if (o.isArray(runtime)) {
            return convertJSIArrayToNSArray(runtime, o.getArray(runtime), jsInvoker, useNSNull);
        }
        if (o.isFunction(runtime)) {
            return convertJSIFunctionToCallback(runtime, o.getFunction(runtime), jsInvoker);
        }
        return convertJSIObjectToNSDictionary(runtime, o, jsInvoker, useNSNull);
    }

    throw std::runtime_error("Unsupported jsi::Value kind");
}

static jsi::Value createJSRuntimeError(jsi::Runtime &runtime, const std::string &message)
{
    return runtime.global().getPropertyAsFunction(runtime, "Error").call(runtime, message);
}

static jsi::JSError convertNSExceptionToJSError(
    jsi::Runtime &runtime,
    NSException *exception,
    const std::string &moduleName,
    const std::string &methodName)
{
    std::string reason = [exception.reason UTF8String];

    jsi::Object cause(runtime);
    cause.setProperty(runtime, "name", [exception.name UTF8String]);
    cause.setProperty(runtime, "message", reason);
    cause.setProperty(runtime, "stackSymbols", convertNSArrayToJSIArray(runtime, exception.callStackSymbols));
    cause.setProperty(
        runtime, "stackReturnAddresses", convertNSArrayToJSIArray(runtime, exception.callStackReturnAddresses));

    std::string message = moduleName + "." + methodName + " raised an exception: " + reason;
    jsi::Value error = createJSRuntimeError(runtime, message);
    error.asObject(runtime).setProperty(runtime, "cause", std::move(cause));
    return {runtime, std::move(error)};
}

static jsi::Value convertJSErrorDetailsToJSRuntimeError(jsi::Runtime &runtime, NSDictionary *jsErrorDetails)
{
    NSString *message = jsErrorDetails[@"message"];

    auto jsError = createJSRuntimeError(runtime, [message UTF8String]);
    for (NSString *key in jsErrorDetails) {
        id value = jsErrorDetails[key];
        jsError.asObject(runtime).setProperty(runtime, [key UTF8String], convertObjCObjectToJSIValue(runtime, value));
    }

    return jsError;
}

}  // namespace TurboModuleConvertUtils

jsi::Value
ObjCTurboModule::createPromise(jsi::Runtime &runtime, const std::string &methodName, PromiseInvocationBlock invoke)
{
    if (!invoke) {
        return jsi::Value::undefined();
    }

    jsi::Function Promise = runtime.global().getPropertyAsFunction(runtime, "Promise");

    PromiseInvocationBlock invokeCopy = [invoke copy];
    return Promise.callAsConstructor(
        runtime,
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "fn"),
            2,
            [invokeCopy, jsInvoker = jsInvoker_, moduleName = name_, methodName](
                jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) {
                std::string moduleMethod = moduleName + "." + methodName + "()";

                if (count != 2) {
                    throw std::invalid_argument(
                        moduleMethod + ": Promise must pass constructor function two args. Passed " + std::to_string(count) +
                        " args.");
                }
                if (!invokeCopy) {
                    return jsi::Value::undefined();
                }

                __block BOOL resolveWasCalled = NO;
                __block std::optional<AsyncCallback<>> resolve(
                    {rt, args[0].getObject(rt).getFunction(rt), std::move(jsInvoker)});
                __block std::optional<AsyncCallback<>> reject(
                    {rt, args[1].getObject(rt).getFunction(rt), std::move(jsInvoker)});

                RCTPromiseResolveBlock resolveBlock = ^(id result) {
                    if (!resolve || !reject) {
                        if (resolveWasCalled) {
                            NSLog(@"%s: Tried to resolve a promise more than once.", moduleMethod.c_str());
                        } else {
                            NSLog(@"%s: Tried to resolve a promise after it's already been rejected.", moduleMethod.c_str());
                        }
                        return;
                    }

                    resolve->call([result](jsi::Runtime &rt, jsi::Function &jsFunction) {
                        jsFunction.call(rt, convertObjCObjectToJSIValue(rt, result));
                    });

                    resolveWasCalled = YES;
                    resolve = std::nullopt;
                    reject = std::nullopt;
                };

                RCTPromiseRejectBlock rejectBlock = ^(NSString *code, NSString *message, NSError *error) {
                    if (!resolve || !reject) {
                        if (resolveWasCalled) {
                            NSLog(@"%s: Tried to reject a promise after it's already been resolved.", moduleMethod.c_str());
                        } else {
                            NSLog(@"%s: Tried to reject a promise more than once.", moduleMethod.c_str());
                        }
                        return;
                    }

                    NSDictionary *jsErrorDetails = RNWJSErrorFromCodeMessageAndNSError(code, message, error);
                    reject->call([jsErrorDetails](jsi::Runtime &rt, jsi::Function &jsFunction) {
                        jsFunction.call(rt, convertJSErrorDetailsToJSRuntimeError(rt, jsErrorDetails));
                    });
                    resolveWasCalled = NO;
                    resolve = std::nullopt;
                    reject = std::nullopt;
                };

                invokeCopy(resolveBlock, rejectBlock);
                return jsi::Value::undefined();
            }));
}

id ObjCTurboModule::performMethodInvocation(
    jsi::Runtime &runtime,
    bool isSync,
    const char *methodName,
    NSInvocation *inv,
    NSMutableArray *retainedObjectsForInvocation)
{
    __block id result;
    __weak id<RCTBridgeModule> weakModule = instance_;
    const char *moduleName = name_.c_str();
    std::string methodNameStr{methodName};
    __block int32_t asyncCallCounter = 0;

    void (^block)() = ^{
        id<RCTBridgeModule> strongModule = weakModule;
        if (!strongModule) {
            return;
        }

        if (isSync) {
            TurboModulePerfLogger::syncMethodCallExecutionStart(moduleName, methodName);
        } else {
            TurboModulePerfLogger::asyncMethodCallExecutionStart(moduleName, methodName, asyncCallCounter);
        }

        @try {
            [inv invokeWithTarget:strongModule];
        } @catch (NSException *exception) {
            if (isSync) {
                throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);
            } else {
                @throw exception;
            }
        } @finally {
            [retainedObjectsForInvocation removeAllObjects];
        }

        if (!isSync) {
            TurboModulePerfLogger::asyncMethodCallExecutionEnd(moduleName, methodName, asyncCallCounter);
            return;
        }

        void *rawResult;
        [inv getReturnValue:&rawResult];
        result = (__bridge id)rawResult;
        TurboModulePerfLogger::syncMethodCallExecutionEnd(moduleName, methodName);
    };

    if (isSync) {
        nativeMethodCallInvoker_->invokeSync(methodNameStr, [&]() -> void { block(); });
        return result;
    } else {
        asyncCallCounter = getUniqueId();
        TurboModulePerfLogger::asyncMethodCallDispatch(moduleName, methodName);
        nativeMethodCallInvoker_->invokeAsync(methodNameStr, [block, moduleName, methodNameStr]() -> void {
            block();
        });
        return nil;
    }
}

void ObjCTurboModule::performVoidMethodInvocation(
    jsi::Runtime &runtime,
    const char *methodName,
    NSInvocation *inv,
    NSMutableArray *retainedObjectsForInvocation)
{
    __weak id<RCTBridgeModule> weakModule = instance_;
    const char *moduleName = name_.c_str();
    std::string methodNameStr{methodName};
    __block int32_t asyncCallCounter = 0;

    void (^block)() = ^{
        id<RCTBridgeModule> strongModule = weakModule;
        if (!strongModule) {
            return;
        }

        if (shouldVoidMethodsExecuteSync_) {
            TurboModulePerfLogger::syncMethodCallExecutionStart(moduleName, methodName);
        } else {
            TurboModulePerfLogger::asyncMethodCallExecutionStart(moduleName, methodName, asyncCallCounter);
        }

        @try {
            [inv invokeWithTarget:strongModule];
        } @catch (NSException *exception) {
            throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);
        } @finally {
            [retainedObjectsForInvocation removeAllObjects];
        }

        if (shouldVoidMethodsExecuteSync_) {
            TurboModulePerfLogger::syncMethodCallExecutionEnd(moduleName, methodName);
        } else {
            TurboModulePerfLogger::asyncMethodCallExecutionEnd(moduleName, methodName, asyncCallCounter);
        }
    };

    if (shouldVoidMethodsExecuteSync_) {
        nativeMethodCallInvoker_->invokeSync(methodNameStr, [&]() -> void { block(); });
    } else {
        asyncCallCounter = getUniqueId();
        TurboModulePerfLogger::asyncMethodCallDispatch(moduleName, methodName);
        nativeMethodCallInvoker_->invokeAsync(methodNameStr, [moduleName, methodNameStr, block]() -> void {
            block();
        });
    }
}

jsi::Value ObjCTurboModule::convertReturnIdToJSIValue(
    jsi::Runtime &runtime,
    const char *methodName,
    TurboModuleMethodValueKind returnType,
    id result)
{
    if (returnType == VoidKind) {
        return jsi::Value::undefined();
    }

    if (result == (id)kCFNull || result == nil) {
        return jsi::Value::null();
    }

    jsi::Value returnValue = jsi::Value::undefined();

    switch (returnType) {
        case VoidKind: {
            break;
        }
        case BooleanKind: {
            returnValue = convertNSNumberToJSIBoolean(runtime, (NSNumber *)result);
            break;
        }
        case NumberKind: {
            returnValue = convertNSNumberToJSINumber(runtime, (NSNumber *)result);
            break;
        }
        case StringKind: {
            returnValue = convertNSStringToJSIString(runtime, (NSString *)result);
            break;
        }
        case ObjectKind: {
            returnValue = convertNSDictionaryToJSIObject(runtime, (NSDictionary *)result);
            break;
        }
        case ArrayKind: {
            returnValue = convertNSArrayToJSIArray(runtime, (NSArray *)result);
            break;
        }
        case FunctionKind:
            throw std::runtime_error("convertReturnIdToJSIValue: FunctionKind is not supported yet.");
        case PromiseKind:
            throw std::runtime_error("convertReturnIdToJSIValue: PromiseKind wasn't handled properly.");
    }

    return returnValue;
}

void ObjCTurboModule::setInvocationArg(
    jsi::Runtime &runtime,
    const char *methodName,
    const std::string &objCArgType,
    const jsi::Value &arg,
    size_t i,
    NSInvocation *inv,
    NSMutableArray *retainedObjectsForInvocation)
{
    if (arg.isBool()) {
        bool v = arg.getBool();
        if (objCArgType == @encode(id)) {
            id objCArg = [NSNumber numberWithBool:v];
            [inv setArgument:(void *)&objCArg atIndex:i + 2];
            [retainedObjectsForInvocation addObject:objCArg];
        } else {
            [inv setArgument:(void *)&v atIndex:i + 2];
        }
        return;
    }

    if (arg.isNumber()) {
        double v = arg.getNumber();
        if (objCArgType == @encode(id)) {
            id objCArg = [NSNumber numberWithDouble:v];
            [inv setArgument:(void *)&objCArg atIndex:i + 2];
            [retainedObjectsForInvocation addObject:objCArg];
        } else if (objCArgType == @encode(NSInteger)) {
            NSInteger integer = v;
            [inv setArgument:&integer atIndex:i + 2];
        } else {
            [inv setArgument:(void *)&v atIndex:i + 2];
        }
        return;
    }

    // Upstream RCTConvert/RCTCxxConvert fallbacks for custom ObjC types
    // (UIColor, structs) are not ported — handle those in the module body.
    BOOL enableModuleArgumentNSNullConversionIOS = ReactNativeFeatureFlags::enableModuleArgumentNSNullConversionIOS();
    id objCArg = convertJSIValueToObjCObject(runtime, arg, jsInvoker_, enableModuleArgumentNSNullConversionIOS);
    [inv setArgument:(void *)&objCArg atIndex:i + 2];
    if (objCArg) {
        [retainedObjectsForInvocation addObject:objCArg];
    }
}

NSInvocation *ObjCTurboModule::createMethodInvocation(
    jsi::Runtime &runtime,
    bool isSync,
    const char *methodName,
    SEL selector,
    const jsi::Value *args,
    size_t count,
    NSMutableArray *retainedObjectsForInvocation)
{
    const char *moduleName = name_.c_str();
    const NSObject<RCTBridgeModule> *module = instance_;

    if (isSync) {
        TurboModulePerfLogger::syncMethodCallArgConversionStart(moduleName, methodName);
    } else {
        TurboModulePerfLogger::asyncMethodCallArgConversionStart(moduleName, methodName);
    }

    NSMethodSignature *methodSignature = [module methodSignatureForSelector:selector];
    NSInvocation *inv = [NSInvocation invocationWithMethodSignature:methodSignature];
    [inv setSelector:selector];

    for (size_t i = 0; i < count; i++) {
        const jsi::Value &arg = args[i];
        const std::string objCArgType = [methodSignature getArgumentTypeAtIndex:i + 2];
        setInvocationArg(runtime, methodName, objCArgType, arg, i, inv, retainedObjectsForInvocation);
    }

    if (isSync) {
        TurboModulePerfLogger::syncMethodCallArgConversionEnd(moduleName, methodName);
    } else {
        TurboModulePerfLogger::asyncMethodCallArgConversionEnd(moduleName, methodName);
    }

    return inv;
}

bool ObjCTurboModule::isMethodSync(TurboModuleMethodValueKind returnType)
{
    if (isSyncModule_) {
        return true;
    }
    if (returnType == VoidKind && shouldVoidMethodsExecuteSync_) {
        return true;
    }
    return !(returnType == VoidKind || returnType == PromiseKind);
}

ObjCTurboModule::ObjCTurboModule(const InitParams &params)
    : TurboModule(params.moduleName, params.jsInvoker),
      instance_(params.instance),
      nativeMethodCallInvoker_(params.nativeMethodCallInvoker),
      isSyncModule_(params.isSyncModule),
      shouldVoidMethodsExecuteSync_(params.shouldVoidMethodsExecuteSync)
{
}

jsi::Value ObjCTurboModule::invokeObjCMethod(
    jsi::Runtime &runtime,
    TurboModuleMethodValueKind returnType,
    const std::string &methodNameStr,
    SEL selector,
    const jsi::Value *args,
    size_t count)
{
    const char *moduleName = name_.c_str();
    const char *methodName = methodNameStr.c_str();

    bool isSyncInvocation = isMethodSync(returnType);

    if (isSyncInvocation) {
        TurboModulePerfLogger::syncMethodCallStart(moduleName, methodName);
    } else {
        TurboModulePerfLogger::asyncMethodCallStart(moduleName, methodName);
    }

    NSMutableArray *retainedObjectsForInvocation = [NSMutableArray arrayWithCapacity:count + 2];
    NSInvocation *inv = createMethodInvocation(
        runtime, isSyncInvocation, methodName, selector, args, count, retainedObjectsForInvocation);

    jsi::Value returnValue = jsi::Value::undefined();

    switch (returnType) {
        case PromiseKind: {
            returnValue = createPromise(
                runtime, methodNameStr, ^(RCTPromiseResolveBlock resolveBlock, RCTPromiseRejectBlock rejectBlock) {
                    RCTPromiseResolveBlock resolveCopy = [resolveBlock copy];
                    RCTPromiseRejectBlock rejectCopy = [rejectBlock copy];
                    [inv setArgument:(void *)&resolveCopy atIndex:count + 2];
                    [inv setArgument:(void *)&rejectCopy atIndex:count + 3];
                    [retainedObjectsForInvocation addObject:resolveCopy];
                    [retainedObjectsForInvocation addObject:rejectCopy];
                    performMethodInvocation(runtime, isSyncInvocation, methodName, inv, retainedObjectsForInvocation);
                });
            break;
        }
        case VoidKind: {
            performVoidMethodInvocation(runtime, methodName, inv, retainedObjectsForInvocation);
            if (isSyncInvocation) {
                TurboModulePerfLogger::syncMethodCallReturnConversionStart(moduleName, methodName);
            }
            returnValue = jsi::Value::undefined();
            if (isSyncInvocation) {
                TurboModulePerfLogger::syncMethodCallReturnConversionEnd(moduleName, methodName);
            }
            break;
        }
        case BooleanKind:
        case NumberKind:
        case StringKind:
        case ObjectKind:
        case ArrayKind:
        case FunctionKind: {
            id result = performMethodInvocation(runtime, true, methodName, inv, retainedObjectsForInvocation);
            TurboModulePerfLogger::syncMethodCallReturnConversionStart(moduleName, methodName);
            returnValue = convertReturnIdToJSIValue(runtime, methodName, returnType, result);
            TurboModulePerfLogger::syncMethodCallReturnConversionEnd(moduleName, methodName);
        } break;
    }

    if (isSyncInvocation) {
        TurboModulePerfLogger::syncMethodCallEnd(moduleName, methodName);
    } else {
        TurboModulePerfLogger::asyncMethodCallEnd(moduleName, methodName);
    }

    return returnValue;
}

void ObjCTurboModule::setEventEmitterCallback(EventEmitterCallback eventEmitterCallback)
{
    if ([instance_ conformsToProtocol:@protocol(RCTTurboModule)] &&
        [instance_ respondsToSelector:@selector(setEventEmitterCallback:)]) {
        EventEmitterCallbackWrapper *wrapper = [EventEmitterCallbackWrapper new];
        wrapper->_eventEmitterCallback = std::move(eventEmitterCallback);
        [(id<RCTTurboModule>)instance_ setEventEmitterCallback:wrapper];
    }
}

}  // namespace facebook::react

@implementation EventEmitterCallbackWrapper
@end
