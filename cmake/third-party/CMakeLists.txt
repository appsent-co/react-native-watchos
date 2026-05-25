cmake_minimum_required(VERSION 3.20)
project(ReactNativeWatchOSThirdParty)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set up watchOS toolchain
set(CMAKE_SYSTEM_NAME watchOS)
set(CMAKE_OSX_DEPLOYMENT_TARGET "7.0" CACHE STRING "Minimum watchOS deployment version")

# Platform-specific settings
if(NOT DEFINED PLATFORM_NAME)
    set(PLATFORM_NAME "watchos")
endif()

if(NOT DEFINED CMAKE_OSX_ARCHITECTURES)
    if(PLATFORM_NAME STREQUAL "watchsimulator")
        set(CMAKE_OSX_ARCHITECTURES "x86_64" CACHE STRING "Build architectures for watchOS Simulator")
    else()
        set(CMAKE_OSX_ARCHITECTURES "arm64_32" CACHE STRING "Build architectures for watchOS Device")
    endif()
endif()

# Pick the matching SDK so the produced static library has the correct
# LC_BUILD_VERSION platform tag (WATCHOS vs WATCHOSSIMULATOR). Without
# this, libtool combines the device + sim archives identically and
# `xcodebuild -create-xcframework` rejects them as the same identifier.
if(PLATFORM_NAME STREQUAL "watchsimulator")
    set(CMAKE_OSX_SYSROOT "watchsimulator" CACHE STRING "" FORCE)
else()
    set(CMAKE_OSX_SYSROOT "watchos" CACHE STRING "" FORCE)
endif()

# Common compiler flags for watchOS
add_compile_options(
    -fvisibility=hidden
    -DTARGET_OS_WATCH=1
)

if(PLATFORM_NAME STREQUAL "watchsimulator")
    add_compile_definitions(TARGET_OS_SIMULATOR=1)
endif()

# Disable code signing for static libraries
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED NO)
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED NO)

include(FetchContent)

FetchContent_Declare(
    folly
    URL https://github.com/facebook/folly/archive/refs/tags/v2024.11.18.00.tar.gz
    URL_HASH SHA256=b2c6879ba8ba625218d1ab9eefcc1611a9003d05bc2cb1a38f3bae21892e5167
)

FetchContent_Declare(
    fmt
    URL https://github.com/fmtlib/fmt/archive/refs/tags/11.0.2.tar.gz
    URL_HASH SHA256=6cb1e6d37bdcb756dbbe59be438790db409cdb4868c66e888d5df9f13f7c027f
)

FetchContent_Declare(
    glog
    URL https://github.com/google/glog/archive/refs/tags/v0.7.1.tar.gz
    URL_HASH SHA256=00e4a87e87b7e7612f519a41e491f16623b12423620006f59f5688bfd8d13b08
)

FetchContent_Declare(
    double-conversion
    URL https://github.com/google/double-conversion/archive/refs/tags/v3.3.0.tar.gz
    URL_HASH SHA256=04ec44461850abbf33824da84978043b22554896b552c5fd11a9c5ae4b4d296e
)

FetchContent_Declare(
    boost
    URL https://archives.boost.io/release/1.84.0/source/boost_1_84_0.tar.gz
    URL_HASH SHA256=a5800f405508f5df8114558ca9855d2640a2de8f0445f051fa1c7c3383045724
)

FetchContent_Declare(
    fast_float
    URL https://github.com/fastfloat/fast_float/archive/refs/tags/v8.0.0.tar.gz
    URL_HASH SHA256=f312f2dc34c61e665f4b132c0307d6f70ad9420185fa831911bc24408acf625d
)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "")

set(WITH_GFLAGS OFF CACHE BOOL "")
set(WITH_GTEST OFF CACHE BOOL "")
set(BUILD_TESTING OFF CACHE BOOL "")
FetchContent_MakeAvailable(double-conversion boost fast_float)

# fmt: populate sources only, do NOT use fmt's CMakeLists.txt. fmt 11.0.2's
# compiled sources (os.cc, format.cc, format-inl.h) trigger FMT_STRING /
# consteval failures under clang-21 (Xcode 26.5) + C++20 + watchOS SDK 26.x.
# Avoid the .cc files entirely by exposing fmt as a header-only INTERFACE
# library — every consumer translation unit gets its own instantiations.
#
# Patch fmt/base.h's FMT_USE_CONSTEVAL detection to disable consteval
# unconditionally. fmt only enables consteval on Apple clang >= 14000029L
# (line ~122), and clang 21 falls through to the `__cpp_consteval` branch
# which sets FMT_USE_CONSTEVAL=1. The compile-time format-string parser is
# then invoked with non-constexpr args (e.g. `int& error_code`), which the
# stricter clang-21 consteval enforcement rejects. Downgrading to plain
# constexpr keeps fmt working at runtime.
FetchContent_GetProperties(fmt)
if(NOT fmt_POPULATED)
    FetchContent_Populate(fmt)
endif()
FetchContent_GetProperties(fmt SOURCE_DIR FMT_SOURCE_DIR)
set(FMT_BASE_H "${FMT_SOURCE_DIR}/include/fmt/base.h")
file(READ "${FMT_BASE_H}" FMT_BASE_CONTENT)
string(REPLACE
    "#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L"
    "#elif defined(__apple_build_version__) // patched: force consteval off on Apple clang (clang-21 regression)"
    FMT_BASE_CONTENT "${FMT_BASE_CONTENT}")
file(WRITE "${FMT_BASE_H}" "${FMT_BASE_CONTENT}")
add_library(fmt INTERFACE)
target_include_directories(fmt INTERFACE "${FMT_SOURCE_DIR}/include")
target_compile_definitions(fmt INTERFACE FMT_HEADER_ONLY=1)

# Build glog with patched CMakeLists to control include paths
FetchContent_GetProperties(glog)
if(NOT glog_POPULATED)
    FetchContent_Populate(glog)
    FetchContent_GetProperties(glog SOURCE_DIR GLOG_SOURCE_DIR BINARY_DIR GLOG_BINARY_DIR)

    # Create a wrapper directory with only the headers we want to expose
    file(MAKE_DIRECTORY "${CMAKE_BINARY_DIR}/glog_public_headers")

    # Copy glog's public headers (glog/*.h) to our wrapper, excluding internal src/*.h
    file(GLOB GLOG_PUBLIC_HEADERS "${GLOG_SOURCE_DIR}/src/glog/*.h" "${GLOG_SOURCE_DIR}/src/glog/*.h.in")
    foreach(HEADER ${GLOG_PUBLIC_HEADERS})
        get_filename_component(HEADER_NAME ${HEADER} NAME)
        string(REPLACE ".in" "" HEADER_NAME_CLEAN "${HEADER_NAME}")
        configure_file(${HEADER} "${CMAKE_BINARY_DIR}/glog_public_headers/glog/${HEADER_NAME_CLEAN}" @ONLY)
    endforeach()

    # Patch glog's CMakeLists.txt to use our controlled include directory and disable threads
    file(READ "${GLOG_SOURCE_DIR}/CMakeLists.txt" GLOG_CMAKE_CONTENT)
    # Replace the src directory in INTERFACE includes with our wrapper (keeps src for PRIVATE)
    string(REGEX REPLACE "\\$<BUILD_INTERFACE:\\$\\{glog_SOURCE_DIR\\}/src>" "$<BUILD_INTERFACE:\${CMAKE_BINARY_DIR}/glog_public_headers>" GLOG_CMAKE_CONTENT "${GLOG_CMAKE_CONTENT}")
    # Also handle direct references
    string(REPLACE "INTERFACE_INCLUDE_DIRECTORIES \"\${glog_SOURCE_DIR}/src\"" "INTERFACE_INCLUDE_DIRECTORIES \"\${CMAKE_BINARY_DIR}/glog_public_headers\"" GLOG_CMAKE_CONTENT "${GLOG_CMAKE_CONTENT}")
    # Disable Threads requirement for watchOS
    # string(REPLACE "find_package (Threads REQUIRED)" "# find_package (Threads REQUIRED) - disabled for watchOS" GLOG_CMAKE_CONTENT "${GLOG_CMAKE_CONTENT}")
    file(WRITE "${GLOG_SOURCE_DIR}/CMakeLists.txt" "${GLOG_CMAKE_CONTENT}")

    add_subdirectory("${GLOG_SOURCE_DIR}" "${GLOG_BINARY_DIR}" EXCLUDE_FROM_ALL)
endif()

# Fetch folly but don't use its CMakeLists.txt (we'll build it manually)
FetchContent_GetProperties(folly)
if(NOT folly_POPULATED)
    FetchContent_Populate(folly)
endif()

# boost interface library
FetchContent_GetProperties(boost SOURCE_DIR BOOST_SOURCE_DIR)
add_library(boost_headers INTERFACE)
target_include_directories(boost_headers INTERFACE ${BOOST_SOURCE_DIR})

# fast_float interface library
FetchContent_GetProperties(fast_float SOURCE_DIR FAST_FLOAT_SOURCE_DIR)
add_library(fast_float_headers INTERFACE)
target_include_directories(fast_float_headers INTERFACE ${FAST_FLOAT_SOURCE_DIR}/include)

# Configure folly
FetchContent_GetProperties(folly SOURCE_DIR FOLLY_SOURCE_DIR)
file(WRITE "${FOLLY_SOURCE_DIR}/folly/folly-config.h" "#pragma once

#define FOLLY_MOBILE 1
#define FOLLY_USE_LIBCPP 1
#define FOLLY_HAVE_PTHREAD 1
#define FOLLY_CFG_NO_COROUTINES 1
#define FOLLY_HAVE_CLOCK_GETTIME 1

#pragma clang diagnostic ignored \"-Wcomma\"
")

# Build folly library (based on RCT-Folly.podspec)
add_library(folly STATIC
    ${FOLLY_SOURCE_DIR}/folly/String.cpp
    ${FOLLY_SOURCE_DIR}/folly/Conv.cpp
    ${FOLLY_SOURCE_DIR}/folly/Demangle.cpp
    ${FOLLY_SOURCE_DIR}/folly/FileUtil.cpp
    ${FOLLY_SOURCE_DIR}/folly/Format.cpp
    ${FOLLY_SOURCE_DIR}/folly/lang/SafeAssert.cpp
    ${FOLLY_SOURCE_DIR}/folly/lang/ToAscii.cpp
    ${FOLLY_SOURCE_DIR}/folly/ScopeGuard.cpp
    ${FOLLY_SOURCE_DIR}/folly/Unicode.cpp
    ${FOLLY_SOURCE_DIR}/folly/json/dynamic.cpp
    ${FOLLY_SOURCE_DIR}/folly/json/json.cpp
    ${FOLLY_SOURCE_DIR}/folly/json/json_pointer.cpp
    ${FOLLY_SOURCE_DIR}/folly/container/detail/F14Table.cpp
    ${FOLLY_SOURCE_DIR}/folly/detail/FileUtilDetail.cpp
    ${FOLLY_SOURCE_DIR}/folly/detail/SplitStringSimd.cpp
    ${FOLLY_SOURCE_DIR}/folly/detail/StaticSingletonManager.cpp
    ${FOLLY_SOURCE_DIR}/folly/detail/UniqueInstance.cpp
    ${FOLLY_SOURCE_DIR}/folly/hash/SpookyHashV2.cpp
    ${FOLLY_SOURCE_DIR}/folly/lang/CString.cpp
    ${FOLLY_SOURCE_DIR}/folly/lang/Exception.cpp
    ${FOLLY_SOURCE_DIR}/folly/memory/ReentrantAllocator.cpp
    ${FOLLY_SOURCE_DIR}/folly/memory/detail/MallocImpl.cpp
    ${FOLLY_SOURCE_DIR}/folly/net/NetOps.cpp
    ${FOLLY_SOURCE_DIR}/folly/portability/SysUio.cpp
    ${FOLLY_SOURCE_DIR}/folly/synchronization/SanitizeThread.cpp
    ${FOLLY_SOURCE_DIR}/folly/system/AtFork.cpp
    ${FOLLY_SOURCE_DIR}/folly/system/ThreadId.cpp
    # Fabric subspec
    ${FOLLY_SOURCE_DIR}/folly/SharedMutex.cpp
    ${FOLLY_SOURCE_DIR}/folly/concurrency/CacheLocality.cpp
    ${FOLLY_SOURCE_DIR}/folly/detail/Futex.cpp
    ${FOLLY_SOURCE_DIR}/folly/synchronization/ParkingLot.cpp
)

target_include_directories(folly PUBLIC
    ${FOLLY_SOURCE_DIR}
    ${BOOST_SOURCE_DIR}
    ${FAST_FLOAT_SOURCE_DIR}/include
)

target_link_libraries(folly PUBLIC
    double-conversion
    fmt
    glog
    c++abi
)

target_compile_options(folly PRIVATE
    -DFOLLY_MOBILE=1
    -DFOLLY_USE_LIBCPP=1
    -DFOLLY_CFG_NO_COROUTINES=1
    -DFOLLY_HAVE_CLOCK_GETTIME=1
    -Wno-comma
    -Wno-shorten-64-to-32
    -Wno-documentation
    -faligned-new
)

# Installation
install(TARGETS glog double-conversion folly
    ARCHIVE DESTINATION lib
)
