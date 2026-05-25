cmake_minimum_required(VERSION 3.20)
project(ReactNativeWatchOSHost LANGUAGES C CXX OBJC OBJCXX)

# -----------------------------------------------------------------------------
# Compiles apple/Sources/ReactNativeWatchOSCxx/RNWHermesHost.mm into a static
# library that's later combined with libjsi.a to form the XCFramework slice
# consumed by SPM as the `ReactNativeWatchOSCxx` binary target.
#
# Inputs (set by build-xcframework.sh per slice):
#   -DPLATFORM_NAME=watchos | watchsimulator
#   -DCMAKE_OSX_ARCHITECTURES=arm64_32 | "x86_64;arm64"
#   -DCMAKE_OSX_DEPLOYMENT_TARGET=<min watchOS version>
#   -DHERMES_FRAMEWORK_DIR=<directory containing hermes.framework>
# -----------------------------------------------------------------------------

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_SYSTEM_NAME watchOS)

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

# Pick the matching SDK so the produced static library has the correct
# LC_BUILD_VERSION platform tag (WATCHOS vs WATCHOSSIMULATOR). Without this,
# xcodebuild -create-xcframework rejects both slices as the same identifier.
if(PLATFORM_NAME STREQUAL "watchsimulator")
    set(CMAKE_OSX_SYSROOT "watchsimulator" CACHE STRING "" FORCE)
else()
    set(CMAKE_OSX_SYSROOT "watchos" CACHE STRING "" FORCE)
endif()

if(NOT DEFINED HERMES_FRAMEWORK_DIR)
    message(FATAL_ERROR
        "HERMES_FRAMEWORK_DIR must be set (directory containing hermes.framework)")
endif()

# Hermes's `hermes.h` does `#include <jsi/hermes-interfaces.h>` (since
# RN 0.81 / Hermes 2025-07). That header is shipped in Hermes's own JSI
# fork (API/jsi/jsi/hermes-interfaces.h), NOT in react-native's vendored
# JSI fork — so RNWHost needs the Hermes source's API/jsi on its include
# path alongside the JSI dir below.
if(NOT DEFINED HERMES_SOURCE_DIR)
    message(FATAL_ERROR
        "HERMES_SOURCE_DIR must be set (Hermes git checkout root)")
endif()

set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED NO)
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED NO)

add_compile_options(
    -fvisibility=hidden
    -DTARGET_OS_WATCH=1
    -fobjc-arc
    -fexceptions
    -frtti
)

if(PLATFORM_NAME STREQUAL "watchsimulator")
    add_compile_definitions(TARGET_OS_SIMULATOR=1)
endif()

# -----------------------------------------------------------------------------
# Locate companion artifacts produced earlier in the build pipeline
# -----------------------------------------------------------------------------

if(PLATFORM_NAME STREQUAL "watchsimulator")
    set(JSI_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/jsi/simulator")
    set(REACTCOMMON_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/reactcommon/simulator")
    set(THIRD_PARTY_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/third-party/simulator")
else()
    set(JSI_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/jsi/device")
    set(REACTCOMMON_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/reactcommon/device")
    set(THIRD_PARTY_BUILD "${CMAKE_CURRENT_SOURCE_DIR}/../../build/third-party/device")
endif()

set(SOURCES_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../apple/Sources/ReactNativeWatchOSCxx")
# Use Hermes's own JSI fork (matches what Hermes itself was built against).
# Mixing this with RN's vendored fork in node_modules causes an ABI
# mismatch — see cmake/jsi/CMakeLists.txt for the full reason.
set(JSI_DIR "${HERMES_SOURCE_DIR}/API/jsi")

# Headers we need from RN's ReactCommon for the TurboModule glue. Pulled
# straight from node_modules so we don't have to install + copy via the
# reactcommon build's `install` step — only the .a archives are consumed
# from the reactcommon build (combined via libtool in build-xcframework.sh).
set(RN_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules/react-native/ReactCommon")
set(FOLLY_INCLUDE "${THIRD_PARTY_BUILD}/_deps/folly-src")
set(BOOST_INCLUDE "${THIRD_PARTY_BUILD}/_deps/boost-src")
set(DOUBLE_CONVERSION_INCLUDE "${THIRD_PARTY_BUILD}/_deps/double-conversion-src")
set(FMT_INCLUDE "${THIRD_PARTY_BUILD}/_deps/fmt-src/include")
set(FAST_FLOAT_INCLUDE "${THIRD_PARTY_BUILD}/_deps/fast_float-src/include")

# -----------------------------------------------------------------------------
# RNWHost static library
# -----------------------------------------------------------------------------

add_library(RNWHost STATIC
    "${SOURCES_DIR}/RNWHermesHost.mm"
    "${SOURCES_DIR}/RNWShadowNode.mm"
    "${SOURCES_DIR}/RNWUIManager.mm"
    "${SOURCES_DIR}/RNWWebSocket.mm"
    "${SOURCES_DIR}/RNWXHR.mm"
    "${SOURCES_DIR}/RNWTurboModuleRegistry.mm"
    "${SOURCES_DIR}/RNWTurboModule.mm"
    # Watch fork of `<React/RCTEventEmitter.h>`. Compiled only here (not
    # via the pod) so the iOS slice picks up the real RCTEventEmitter
    # from React-Core with no symbol clash. The header lives under
    # `include/React/RCTEventEmitter.h` and is installed into the
    # xcframework Headers/ root for `<React/...>`-style imports.
    "${SOURCES_DIR}/RNWRCTEventEmitter.mm"
)

target_include_directories(RNWHost PUBLIC
    "${SOURCES_DIR}/include"
    "${SOURCES_DIR}"
    "${JSI_DIR}"
    "${RN_COMMON_DIR}"
    "${RN_COMMON_DIR}/callinvoker"
    "${RN_COMMON_DIR}/react/nativemodule/core"
    # `<reactperflogger/...>` is pulled in by TurboModulePerfLogger.h
    # (consumed by our RNWTurboModule.mm fork). Not installed under a
    # flat tree — point directly at the source dir.
    "${RN_COMMON_DIR}/reactperflogger"
    # `<glog/...>` is pulled in by the TurboModule core's JSI↔ObjC
    # conversion logger. Three dirs in priority order: the
    # `glog_public_headers` wrapper that third-party CMake builds
    # (which strips internal headers), then the build dir for the
    # generated `glog/export.h`, then the source dir as a fallback.
    "${THIRD_PARTY_BUILD}/glog_public_headers"
    "${THIRD_PARTY_BUILD}/_deps/glog-build"
    "${THIRD_PARTY_BUILD}/_deps/glog-src/src"
    "${FOLLY_INCLUDE}"
    "${BOOST_INCLUDE}"
    "${DOUBLE_CONVERSION_INCLUDE}"
    "${FMT_INCLUDE}"
    "${FAST_FLOAT_INCLUDE}"
)

# glog 0.7's logging.h refuses to expand without these defines (see the
# same setup in cmake/reactcommon/CMakeLists.txt). Propagate to every
# .mm in this target.
target_compile_definitions(RNWHost PRIVATE
    GLOG_USE_GLOG_EXPORT
    GLOG_NO_ABBREVIATED_SEVERITIES
    # Same folly compile-time tunings as cmake/reactcommon — keeps our
    # header-only folly consumers (TurboModule core's Bridging templates)
    # in sync with what the folly archive itself was built against.
    FOLLY_NO_CONFIG=1
    FOLLY_MOBILE=1
    FOLLY_USE_LIBCPP=1
    FOLLY_CFG_NO_COROUTINES=1
    FOLLY_HAVE_CLOCK_GETTIME=1
)

target_compile_options(RNWHost PRIVATE
    -Wno-comma
    -Wno-shorten-64-to-32
)

# Hermes ships as a framework, so its headers must be found via `-F` rather
# than a plain include directory — otherwise `#import <hermesvm/hermes.h>`
# (framework-style import) won't resolve.
target_compile_options(RNWHost PUBLIC
    "-F${HERMES_FRAMEWORK_DIR}"
)

# A static library doesn't actually link, so we don't need to point at the
# Hermes framework here — only the consumer app (the watch app) needs to do
# that, and it does so via SPM embedding Hermes.xcframework. We just need
# Hermes's headers on the include path for compilation.

# -----------------------------------------------------------------------------
# Install
# -----------------------------------------------------------------------------

install(TARGETS RNWHost
    ARCHIVE DESTINATION lib
)

# Install our watchOS-safe forks of the upstream RN ObjC TurboModule
# headers. These live at `<install>/include/React/RCTBridgeModule.h` and
# `<install>/include/ReactCommon/RCTTurboModule.h` so they ship in the
# xcframework's Headers/ root — that way a maintainer's
# `#import <React/RCTBridgeModule.h>` (or `<ReactCommon/RCTTurboModule.h>`)
# resolves to our fork on watchOS and to RN's pod on iOS.
install(DIRECTORY "${SOURCES_DIR}/include/React"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${SOURCES_DIR}/include/ReactCommon"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
# Stub headers that `@react-native/codegen`-emitted `Native<Foo>Spec.h`
# unconditionally `#import`s. See the header bodies for why empty stubs
# suffice for v1.
install(DIRECTORY "${SOURCES_DIR}/include/RCTRequired"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)
install(DIRECTORY "${SOURCES_DIR}/include/RCTTypeSafety"
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)

# Install only the public headers here. The module.modulemap lives at the
# XCFramework's Headers/ root (not inside the per-module subdir) and is
# written by build-xcframework.sh after this install completes — keeping
# them in different scopes avoids a duplicate-modulemap warning from Xcode.
install(DIRECTORY "${SOURCES_DIR}/include/ReactNativeWatchOSCxx"
    DESTINATION include
    FILES_MATCHING
        PATTERN "*.h"
)
