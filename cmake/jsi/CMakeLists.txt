cmake_minimum_required(VERSION 3.20)
project(ReactNativeJSI)

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
        set(CMAKE_OSX_ARCHITECTURES "x86_64;arm64" CACHE STRING "Build architectures for watchOS Simulator")
    else()
        set(CMAKE_OSX_ARCHITECTURES "arm64_32" CACHE STRING "Build architectures for watchOS Device")
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

# Disable code signing for static libraries
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED NO)
set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED NO)

# Common compiler flags
add_compile_options(
    -fvisibility=hidden
    -DTARGET_OS_WATCH=1
    -Wall
    -fexceptions
    -frtti
)

if(PLATFORM_NAME STREQUAL "watchsimulator")
    add_compile_definitions(TARGET_OS_SIMULATOR=1)
endif()

# JSI source files. We deliberately exclude JSIDynamic.{h,cpp} — they are the
# only JSI translation units that depend on folly + glog, and the POC has no
# need for the folly::dynamic ↔ JSI adapter. Skipping them lets us build JSI
# without standing up the third-party CMake build.
#
# Source = Hermes's *own* JSI fork ($HERMES_SOURCE_DIR/API/jsi), NOT React
# Native's vendored copy under node_modules. Hermes itself is built against
# its own fork, so jsi::Value / jsi::Function layouts must come from the
# same fork to avoid an ABI mismatch (symptom: SIGABRT inside
# createFromHostFunction or any first JSI call from native code).
if(NOT DEFINED HERMES_SOURCE_DIR)
    message(FATAL_ERROR
        "HERMES_SOURCE_DIR must be set (Hermes git checkout root)")
endif()
set(JSI_DIR "${HERMES_SOURCE_DIR}/API/jsi")
file(GLOB JSI_SRC CONFIGURE_DEPENDS "${JSI_DIR}/jsi/*.cpp")
list(FILTER JSI_SRC EXCLUDE REGEX ".*/JSIDynamic\\.cpp$")

# Build jsi as static library
add_library(jsi STATIC ${JSI_SRC})

target_include_directories(jsi PUBLIC
    ${JSI_DIR}
)

target_compile_options(jsi PRIVATE
    -O3
    -Wno-unused-lambda-capture
)

# Installation
install(TARGETS jsi
    ARCHIVE DESTINATION lib
)

# Headers: install everything except JSIDynamic.h, which references folly.
install(DIRECTORY ${JSI_DIR}/jsi
    DESTINATION include
    FILES_MATCHING
        PATTERN "*.h"
        PATTERN "JSIDynamic.h" EXCLUDE
)
