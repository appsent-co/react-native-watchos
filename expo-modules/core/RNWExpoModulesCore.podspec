require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
versions = JSON.parse(File.read(File.join(__dir__, '..', 'versions.json')))
core_version = versions.fetch('expo-modules-core')
if package.fetch('version') != core_version
  raise "RNWExpoModulesCore package version must match expo-modules-core #{core_version}"
end
overlay_root = File.join(__dir__, 'build', 'ExpoModulesCore')

unless File.directory?(overlay_root)
  raise <<~MESSAGE
    RNWExpoModulesCore source overlay is missing. Generate it before `pod install`:
      node expo-modules/core/scripts/generate-overlay.cjs --project-root <consumer-project>
  MESSAGE
end

Pod::Spec.new do |s|
  s.name = 'RNWExpoModulesCore'
  s.module_name = 'ExpoModulesCore'
  s.version = core_version
  s.summary = 'Non-UI watchOS source overlay for Expo Modules Core 57.'
  s.description = <<~DESC
    A version-checked source overlay retaining Expo Modules Core's native Module
    DSL and JSI runtime while excluding React bridge, Fabric, and native view APIs.
  DESC
  s.license = { :type => 'MIT', :file => 'build/ExpoModulesCore/LICENSES/ExpoModulesCore-LICENSE' }
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
  # Let CocoaPods generate the module map from the public headers below.
  # A custom map prevents Swift static-library integration in default Expo apps.

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
  # Keep the supported ObjC bridge surface narrow. The authentic C++ JSI and
  # event-emitter implementation headers remain target-private so Swift clients
  # never import unguarded C++ declarations through the module umbrella.
  s.public_header_files = [
    'build/ExpoModulesCore/ios/ExpoModulesCore.h',
    'build/ExpoModulesCore/ios/Core/Modules/CoreModuleHelper.h',
    'build/ExpoModulesCore/ios/JS/EXJSIInstaller.h',
    'build/ExpoModulesCore/ios/JS/EXJSUtils.h',
    'build/ExpoModulesCore/ios/JS/EXSharedObjectUtils.h'
  ]
  s.private_header_files = [
    'build/ExpoModulesCore/ios/JSI/**/*.h',
    'build/ExpoModulesCore/common/cpp/**/*.h'
  ]

  s.dependency 'RNWExpoModulesJSI'
  s.dependency 'ReactNativeWatchOSCxx'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'GCC_PREPROCESSOR_DEFINITIONS' => "$(inherited) EXPO_MODULES_CORE_VERSION=#{core_version}",
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
