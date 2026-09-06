require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
overlay_root = File.join(__dir__, 'build', 'ExpoModulesCore')

unless File.directory?(overlay_root)
  raise <<~MESSAGE
    RNWExpoModulesCore source overlay is missing. Generate it before `pod install`:
      pnpm --dir poc/expo-modules-core generate
  MESSAGE
end

Pod::Spec.new do |s|
  s.name = 'RNWExpoModulesCore'
  s.module_name = 'ExpoModulesCore'
  s.version = package['version']
  s.summary = 'Non-UI watchOS source overlay for Expo Modules Core 57.'
  s.description = <<~DESC
    A version-checked source overlay retaining Expo Modules Core's native Module
    DSL and JSI runtime while excluding React bridge, Fabric, and native view APIs.
  DESC
  s.license = 'MIT'
  s.author = 'Appsent'
  s.homepage = 'https://github.com/expo/expo/tree/sdk-57/packages/expo-modules-core'
  # Podfiles consume this locally with `:path`; keep a valid source declaration
  # so CocoaPods can validate the podspec without special cases.
  s.source = { :git => 'https://github.com/expo/expo.git', :tag => 'sdk-57' }
  # ExpoModulesJSI's Swift/C++ interop interface requires the watchOS 9.4 SDK.
  s.platform = :watchos, '9.4'
  s.swift_version = '6.0'
  s.static_framework = true
  s.header_dir = 'ExpoModulesCore'
  s.module_map = 'build/ExpoModulesCore/ios/module.modulemap'

  s.source_files = [
    'build/ExpoModulesCore/ios/ExpoModulesCore.swift',
    'build/ExpoModulesCore/ios/ExpoModulesCore.h',
    'build/ExpoModulesCore/ios/Api/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/ios/Core/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/ios/JS/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/ios/JSI/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/ios/Utilities/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/ios/Uuidv5/**/*.{swift,h,m,mm,cpp}',
    'build/ExpoModulesCore/common/cpp/**/*.{h,mm,cpp}'
  ]
  s.public_header_files = [
    'build/ExpoModulesCore/ios/ExpoModulesCore.h',
    'build/ExpoModulesCore/ios/JS/**/*.h',
    'build/ExpoModulesCore/ios/JSI/**/*.h',
    'build/ExpoModulesCore/ios/Core/Modules/CoreModuleHelper.h',
    'build/ExpoModulesCore/common/cpp/**/*.h'
  ]

  s.dependency 'RNWExpoModulesJSI'
  s.dependency 'ReactNativeWatchOSCxx'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) EXPO_MODULES_CORE_VERSION=57.0.16',
    'OTHER_LDFLAGS' => '$(inherited) -lc++',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
    # ExpoModulesJSI's headers must be visible for EXSharedObjectUtils.mm.
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${PODS_XCFRAMEWORKS_BUILD_DIR}/RNWExpoModulesJSI"',
    'HEADER_SEARCH_PATHS' => '$(inherited) "${PODS_XCFRAMEWORKS_BUILD_DIR}/ReactNativeWatchOSCxx/Headers"'
  }
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '$(inherited) -lc++',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64'
  }
end
