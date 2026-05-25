cmake_minimum_required(VERSION 3.20)
project(ReactNativeWatchOSReactCommon)

# -----------------------------------------------------------------------------
# Builds the React Native C++ subsystem (cxxreact + minimal deps) for watchOS.
#
# Pulls sources directly out of node_modules/react-native/ReactCommon. Most
# small dependencies (callinvoker, runtimeexecutor, timing) are header-only
# and exposed as INTERFACE libraries. cxxreact itself is built as a static
# library and linked into the final XCFramework alongside JSI / Hermes /
# third-party C++ deps.
#
# Skipped on watchOS:
#   - jsinspector-modern (CDP / WebSockets / networking — replaced with
#     no-op stubs so cxxreact still links)
#   - Perfetto integration in reactperflogger (Linux/Android-targeted —
#     BridgeNativeModulePerfLogger.cpp is kept; ReactPerfetto*.cpp is not)
# -----------------------------------------------------------------------------

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_SYSTEM_NAME watchOS)
set(CMAKE_OSX_DEPLOYMENT_TARGET "7.0" CACHE STRING "Minimum watchOS deployment version")

if(NOT DEFINED PLATFORM_NAME)
    set(PLATFORM_NAME "watchos")
endif()

if(NOT DEFINED CMAKE_OSX_ARCHITECTURES)
    if(PLATFORM_NAME STREQUAL "watchsimulator")
        set(CMAKE_OSX_ARCHITECTURES "x86_64;arm64" CACHE STRING "")
    else()
        set(CMAKE_OSX_ARCHITECTURES "arm64_32" CACHE STRING "")
    endif()
endif()

# Match the sysroot to PLATFORM_NAME so the produced archives carry the
# correct LC_BUILD_VERSION tag (WATCHOS vs WATCHOSSIMULATOR) — otherwise
# `xcodebuild -create-xcframework` rejects both slices as identical.
if(PLATFORM_NAME STREQUAL "watchsimulator")
    set(CMAKE_OSX_SYSROOT "watchsimulator" CACHE STRING "" FORCE)
else()
    set(CMAKE_OSX_SYSROOT "watchos" CACHE STRING "" FORCE)
endif()

set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED NO)
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED NO)

add_compile_options(
    -fvisibility=hidden
    -DTARGET_OS_WATCH=1
    -fexceptions
    -frtti
    -DFOLLY_NO_CONFIG=1
    -DLOG_TAG="ReactNative"
    -DRN_DISABLE_OSS_PLUGIN_HEADER=1
    # glog 0.7 logging.h refuses to expand without these macros — every
    # consumer that pulls in <glog/logging.h> through cxxreact / react_logger
    # / react_debug needs them. Easier to set project-wide than per-target.
    -DGLOG_USE_GLOG_EXPORT
    -DGLOG_NO_ABBREVIATED_SEVERITIES
)

if(PLATFORM_NAME STREQUAL "watchsimulator")
    add_compile_definitions(TARGET_OS_SIMULATOR=1)
else()
    # arm64_32 — disable folly F14 SIMD intrinsics
    add_compile_definitions(
        FOLLY_HAVE_INT128_T=0
        FOLLY_F14_VECTOR_INTRINSICS_AVAILABLE=0
        FOLLY_MOBILE=1
        FOLLY_F14_FORCE_FALLBACK=1
    )
endif()

# -----------------------------------------------------------------------------
# Locate already-built third-party + JSI artifacts
# -----------------------------------------------------------------------------

if(PLATFORM_NAME STREQUAL "watchsimulator")
    set(THIRD_PARTY_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/third-party/simulator")
    set(JSI_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/jsi/simulator")
else()
    set(THIRD_PARTY_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/third-party/device")
    set(JSI_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/jsi/device")
endif()

set(RN_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules/react-native/ReactCommon")

# JSI MUST come from Hermes's own fork (`$HERMES_SOURCE_DIR/API/jsi`), NOT
# RN's vendored fork (`$RN_COMMON_DIR/jsi`). cmake/jsi builds `libjsi.a`
# from Hermes's fork; if reactcommon's .cpp files include RN's
# `jsi/jsi.h`, the runtime symbols link fine (same mangled names) but the
# class layouts can differ between forks — we hit double-frees /
# malloc-corruption inside TurboModuleBinding when the runtime's vtable
# slots don't match what react_nativemodule_core expected at compile time.
if(NOT DEFINED HERMES_SOURCE_DIR)
    set(HERMES_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../build/hermes/source")
endif()

# Third-party include paths (matches layout produced by cmake/third-party).
# FetchContent keeps each dep's unpacked source under build/_deps regardless
# of install prefix, so we read headers from there directly.
set(FOLLY_INCLUDE "${THIRD_PARTY_BUILD}/_deps/folly-src")
set(BOOST_INCLUDE "${THIRD_PARTY_BUILD}/_deps/boost-src")
set(GLOG_INCLUDE "${THIRD_PARTY_BUILD}/_deps/glog-src/src")
set(GLOG_BUILD_INCLUDE "${THIRD_PARTY_BUILD}/_deps/glog-build")
set(GLOG_PUBLIC_HEADERS "${THIRD_PARTY_BUILD}/glog_public_headers")
set(DOUBLE_CONVERSION_INCLUDE "${THIRD_PARTY_BUILD}/_deps/double-conversion-src")
set(FMT_INCLUDE "${THIRD_PARTY_BUILD}/_deps/fmt-src/include")
set(FAST_FLOAT_INCLUDE "${THIRD_PARTY_BUILD}/_deps/fast_float-src/include")
set(JSI_INCLUDE "${HERMES_SOURCE_DIR}/API/jsi")

# -----------------------------------------------------------------------------
# Import third-party archives produced by `cmake/third-party`. These are
# the *.a files in ${THIRD_PARTY_BUILD}/install/lib/. We declare them as
# IMPORTED static libraries so reactcommon's targets can link them via
# `target_link_libraries(... folly ...)` without using find_package.
# -----------------------------------------------------------------------------

add_library(folly STATIC IMPORTED)
set_target_properties(folly PROPERTIES
    IMPORTED_LOCATION "${THIRD_PARTY_BUILD}/install/lib/libfolly.a"
    INTERFACE_INCLUDE_DIRECTORIES
        "${FOLLY_INCLUDE};${BOOST_INCLUDE};${FAST_FLOAT_INCLUDE}"
)

add_library(glog STATIC IMPORTED)
set_target_properties(glog PROPERTIES
    IMPORTED_LOCATION "${THIRD_PARTY_BUILD}/install/lib/libglog.a"
    INTERFACE_INCLUDE_DIRECTORIES
        "${GLOG_PUBLIC_HEADERS};${GLOG_BUILD_INCLUDE};${GLOG_INCLUDE}"
    # glog 0.7's logging.h has a guard that errors out if these macros
    # aren't defined before include (the project's own glog/export.h /
    # config.h chain). Without them every consumer needs to set them
    # individually — propagating via the imported target keeps it
    # transparent.
    INTERFACE_COMPILE_DEFINITIONS
        "GLOG_USE_GLOG_EXPORT;GLOG_NO_ABBREVIATED_SEVERITIES"
)

add_library(double-conversion STATIC IMPORTED)
set_target_properties(double-conversion PROPERTIES
    IMPORTED_LOCATION "${THIRD_PARTY_BUILD}/install/lib/libdouble-conversion.a"
    INTERFACE_INCLUDE_DIRECTORIES "${DOUBLE_CONVERSION_INCLUDE}"
)

# fmt + boost + fast_float are header-only (no archive). fmt's
# FMT_HEADER_ONLY=1 is set by cmake/third-party — propagate it here.
add_library(fmt INTERFACE)
target_include_directories(fmt INTERFACE "${FMT_INCLUDE}")
target_compile_definitions(fmt INTERFACE FMT_HEADER_ONLY=1)

add_library(boost_headers INTERFACE)
target_include_directories(boost_headers INTERFACE "${BOOST_INCLUDE}")

add_library(fast_float_headers INTERFACE)
target_include_directories(fast_float_headers INTERFACE "${FAST_FLOAT_INCLUDE}")

# -----------------------------------------------------------------------------
# INTERFACE libraries — header-only dependencies of cxxreact
# -----------------------------------------------------------------------------

add_library(react_callinvoker INTERFACE)
target_include_directories(react_callinvoker INTERFACE
    "${RN_COMMON_DIR}/callinvoker"
)

add_library(react_runtimeexecutor INTERFACE)
target_include_directories(react_runtimeexecutor INTERFACE
    "${RN_COMMON_DIR}/runtimeexecutor"
)

add_library(react_timing INTERFACE)
target_include_directories(react_timing INTERFACE
    "${RN_COMMON_DIR}/react/timing"
)

# fbsystrace — RN ships a no-op header that satisfies cxxreact's
# `#include <fbsystrace.h>` when the systrace macros are disabled.
add_library(fbsystrace INTERFACE)
target_include_directories(fbsystrace INTERFACE
    "${RN_COMMON_DIR}/../Libraries/WebPerformance/NativePerformanceObserver"  # placeholder — TODO
)

# -----------------------------------------------------------------------------
# react/debug — 1 .cpp file
# -----------------------------------------------------------------------------

add_library(react_debug STATIC
    "${RN_COMMON_DIR}/react/debug/react_native_assert.cpp"
)
target_include_directories(react_debug PUBLIC "${RN_COMMON_DIR}")
target_link_libraries(react_debug PUBLIC glog)

# -----------------------------------------------------------------------------
# react/logger — 1 .cpp file
# -----------------------------------------------------------------------------

add_library(react_logger STATIC
    "${RN_COMMON_DIR}/logger/react_native_log.cpp"
)
target_include_directories(react_logger PUBLIC
    "${RN_COMMON_DIR}/logger"
)
target_link_libraries(react_logger PUBLIC glog)

# -----------------------------------------------------------------------------
# reactperflogger — keep only BridgeNativeModulePerfLogger.cpp.
# The Perfetto integration files (ReactPerfetto*.cpp, HermesPerfetto*.cpp,
# FuseboxPerfettoDataSource.cpp) need a perfetto SDK that isn't available
# on watchOS. cxxreact only consumes BridgeNativeModulePerfLogger.h.
# -----------------------------------------------------------------------------

add_library(reactperflogger STATIC
    "${RN_COMMON_DIR}/reactperflogger/reactperflogger/BridgeNativeModulePerfLogger.cpp"
)
target_include_directories(reactperflogger PUBLIC
    "${RN_COMMON_DIR}/reactperflogger"
)
target_link_libraries(reactperflogger PUBLIC react_timing folly)

# -----------------------------------------------------------------------------
# jsinspector stub — cxxreact includes `<jsinspector-modern/ReactCdp.h>` and
# touches HostTarget / InstanceTarget / RuntimeTarget. The real impl is
# WebSocket / CDP-heavy and inappropriate on watchOS. This stub exposes the
# same headers (via RN's own headers as the include path) but provides
# weak no-op implementations for the symbols cxxreact pulls in at link time.
#
# TODO: implement jsinspector-stub.cpp covering:
#   - jsinspector_modern::HostTarget create/teardown
#   - jsinspector_modern::InstanceTarget create/teardown
#   - jsinspector_modern::RuntimeTarget create/teardown
#   - getInspectorInstance() returning a no-op IInspector
# -----------------------------------------------------------------------------

add_library(jsinspector_modern_stub STATIC
    jsinspector-stub/InspectorStub.cpp
)
target_include_directories(jsinspector_modern_stub PUBLIC
    "${RN_COMMON_DIR}"  # exposes <jsinspector-modern/...> headers
    "${FOLLY_INCLUDE}"
    "${JSI_INCLUDE}"
)
target_link_libraries(jsinspector_modern_stub PUBLIC react_callinvoker)

# -----------------------------------------------------------------------------
# cxxreact — the main bridge implementation
# -----------------------------------------------------------------------------

file(GLOB CXXREACT_SRC CONFIGURE_DEPENDS
    "${RN_COMMON_DIR}/cxxreact/*.cpp"
)

add_library(react_cxxreact STATIC ${CXXREACT_SRC})

target_include_directories(react_cxxreact PUBLIC
    "${RN_COMMON_DIR}"
    "${RN_COMMON_DIR}/cxxreact"
    "${FOLLY_INCLUDE}"
    "${BOOST_INCLUDE}"
    "${GLOG_INCLUDE}"
    "${GLOG_BUILD_INCLUDE}"
    "${DOUBLE_CONVERSION_INCLUDE}"
    "${FMT_INCLUDE}"
    "${FAST_FLOAT_INCLUDE}"
    "${JSI_INCLUDE}"
)

target_link_libraries(react_cxxreact PUBLIC
    react_callinvoker
    react_runtimeexecutor
    react_debug
    react_logger
    reactperflogger
    jsinspector_modern_stub
    fbsystrace
    folly
    glog
    fmt
    double-conversion
    boost_headers
    fast_float_headers
)

target_compile_options(react_cxxreact PRIVATE
    -Wno-unused-lambda-capture
    -Wno-unused-variable
)

target_compile_definitions(react_cxxreact PRIVATE
    GLOG_USE_GLOG_EXPORT
)

# -----------------------------------------------------------------------------
# react/utils — small Cpp lib used by TurboModule plumbing.
# Only the host-side helpers; we skip the platform/ subdirectory
# (ManagedObjectWrapper.mm is ObjC++ and not needed for the C++ TM core).
# -----------------------------------------------------------------------------

add_library(react_utils STATIC
    "${RN_COMMON_DIR}/react/utils/jsi-utils.cpp"
)
target_include_directories(react_utils PUBLIC
    "${RN_COMMON_DIR}"
    "${JSI_INCLUDE}"
    "${GLOG_INCLUDE}"
    "${GLOG_BUILD_INCLUDE}"
)
target_link_libraries(react_utils PUBLIC glog)

# -----------------------------------------------------------------------------
# react/bridging — provides LongLivedObject (TM async callback lifetime mgmt).
# Everything else under react/bridging is header-only and consumed via the
# `${RN_COMMON_DIR}` include path.
# -----------------------------------------------------------------------------

add_library(react_bridging STATIC
    "${RN_COMMON_DIR}/react/bridging/LongLivedObject.cpp"
)
target_include_directories(react_bridging PUBLIC
    "${RN_COMMON_DIR}"
    "${JSI_INCLUDE}"
)
target_link_libraries(react_bridging PUBLIC folly)

# -----------------------------------------------------------------------------
# react/featureflags — runtime-tunable booleans queried by the TM core
# (e.g. ReactNativeFeatureFlagsEnableMicrotasksInBridgeless).
# -----------------------------------------------------------------------------

add_library(react_featureflags STATIC
    "${RN_COMMON_DIR}/react/featureflags/ReactNativeFeatureFlags.cpp"
    "${RN_COMMON_DIR}/react/featureflags/ReactNativeFeatureFlagsAccessor.cpp"
)
target_include_directories(react_featureflags PUBLIC
    "${RN_COMMON_DIR}"
)

# -----------------------------------------------------------------------------
# react_nativemodule_core — the cross-platform TurboModule C++ core. We
# intentionally skip platform/ios/ because RCTTurboModule.mm pulls in
# <React/RCTBridge.h> which transitively requires UIKit (no watchOS). The
# ObjC adapter equivalent is forked into apple/Sources/ReactNativeWatchOSCxx
# under Phase B.
# -----------------------------------------------------------------------------

set(TM_CORE_DIR "${RN_COMMON_DIR}/react/nativemodule/core/ReactCommon")
add_library(react_nativemodule_core STATIC
    "${TM_CORE_DIR}/CxxTurboModuleUtils.cpp"
    "${TM_CORE_DIR}/TurboCxxModule.cpp"
    "${TM_CORE_DIR}/TurboModule.cpp"
    "${TM_CORE_DIR}/TurboModuleBinding.cpp"
    "${TM_CORE_DIR}/TurboModulePerfLogger.cpp"
    "${TM_CORE_DIR}/TurboModuleUtils.cpp"
    "${TM_CORE_DIR}/TurboModuleWithJSIBindings.cpp"
)
target_include_directories(react_nativemodule_core PUBLIC
    "${RN_COMMON_DIR}/react/nativemodule/core"
    "${RN_COMMON_DIR}"
    "${FOLLY_INCLUDE}"
    "${JSI_INCLUDE}"
    "${GLOG_INCLUDE}"
    "${GLOG_BUILD_INCLUDE}"
    "${DOUBLE_CONVERSION_INCLUDE}"
    "${FMT_INCLUDE}"
    "${FAST_FLOAT_INCLUDE}"
    "${BOOST_INCLUDE}"
)
target_link_libraries(react_nativemodule_core PUBLIC
    react_callinvoker
    react_bridging
    react_utils
    react_featureflags
    reactperflogger
    react_debug
    folly
    glog
    fmt
    double-conversion
    boost_headers
)
target_compile_definitions(react_nativemodule_core PRIVATE
    GLOG_USE_GLOG_EXPORT
)

# -----------------------------------------------------------------------------
# Install
# -----------------------------------------------------------------------------

install(TARGETS
        react_cxxreact
        react_debug
        react_logger
        reactperflogger
        jsinspector_modern_stub
        react_utils
        react_bridging
        react_featureflags
        react_nativemodule_core
    ARCHIVE DESTINATION lib
)

install(DIRECTORY "${RN_COMMON_DIR}/cxxreact"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/callinvoker/ReactCommon"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/runtimeexecutor/ReactCommon"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/react/debug"
    DESTINATION include/react
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/logger"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/reactperflogger/reactperflogger"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/react/utils"
    DESTINATION include/react
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/react/bridging"
    DESTINATION include/react
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/react/featureflags"
    DESTINATION include/react
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${RN_COMMON_DIR}/react/nativemodule/core/ReactCommon"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
