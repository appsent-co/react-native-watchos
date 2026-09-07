require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
versions = JSON.parse(File.read(File.join(__dir__, '..', 'versions.json')))
core_version = versions.fetch('expo-modules-core')
if package.fetch('version') != core_version
  raise "RNWExpoModulesCore package version must match expo-modules-core #{core_version}"
end
Pod::Spec.new do |s|
  s.name = 'RNWExpoModulesCore'
  s.module_name = 'ExpoModulesCore'
  s.version = core_version
  s.summary = 'Non-UI watchOS build for Expo Modules Core 57.'
  s.description = <<~DESC
    A non-UI build of upstream sources retaining Expo Modules Core's native Module
    DSL and JSI runtime while excluding React bridge, Fabric, and native view APIs.
  DESC
  s.license = { :type => 'MIT', :file => 'build/LICENSE' }
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
    'ExpoModulesCore.h',
    'build/ios/ExpoModulesCore.swift',
    'build/ios/{EXDefines.h,Platform/Platform.h,Protocols/EXAppContextProtocol.h}',
    'build/ios/FileSystemUtilities/*.swift',
    'build/ios/Interfaces/{FileSystem,Permissions}/*.{h,m}',
    'build/ios/Legacy/Protocols/{EXInternalModule,EXModuleRegistryConsumer}.h',
    'build/ios/Legacy/ModuleRegistry/*.{h,m}',
    'build/ios/Legacy/EXExportedModule.{h,m}',
    'build/ios/Legacy/Services/Permissions/EXPermissionsService.{h,m}',
    'build/ios/Api/**/*.{swift,h,m,mm,cpp}',
    'build/ios/Core/**/*.{swift,h,m,mm,cpp}',
    'build/ios/JS/ExpoRuntimeInstaller.swift',
    'build/ios/JS/EXJSIInstaller.{h,mm}',
    'build/ios/JS/EXJSUtils.{h,mm}',
    'build/ios/JS/EXSharedObjectUtils.{h,mm}',
    'build/ios/JSI/**/*.{swift,h,m,mm,cpp}',
    'build/ios/Utilities/{Utilities,Mutex}.swift',
    'build/ios/Uuidv5/**/*.{swift,h,m,mm,cpp}',
    'build/common/cpp/**/*.{h,mm,cpp}'
  ]
  s.exclude_files = [
    'build/ios/Api/Builders/ViewDefinitionBuilder.swift',
    'build/ios/Api/Factories/ViewFactories.swift',
    'build/ios/Core/Views/**/*',
    'build/ios/Core/Protocols/AnyExpoView.swift',
    'build/ios/Core/Protocols/AnyViewDefinition.swift',
    'build/ios/Core/DynamicTypes/DynamicViewType.swift',
    'build/ios/Core/DynamicTypes/DynamicSwiftUIViewType.swift',
    'build/ios/Core/Events/EventDispatcher.swift',
    'build/ios/Core/Functions/OptimizedAsyncFunctionDefinition.swift',
    'build/ios/Core/Functions/OptimizedSyncFunctionDefinition.swift',
    'build/ios/Core/ExpoModulesMacros.swift',
    'build/ios/Core/Convertibles/Convertibles+Color.swift',
    'build/common/cpp/fabric/**/*',
    'build/common/cpp/JSI/BridgelessJSCallInvoker.h',
    'build/common/cpp/JSI/TestingSyncJSCallInvoker.h',
  ]
  # Keep the supported ObjC bridge surface narrow. The authentic C++ JSI and
  # event-emitter implementation headers remain target-private so Swift clients
  # never import unguarded C++ declarations through the module umbrella.
  s.public_header_files = [
    'ExpoModulesCore.h',
    'build/ios/{EXDefines.h,Platform/Platform.h,Protocols/EXAppContextProtocol.h}',
    'build/ios/Interfaces/{FileSystem,Permissions}/*.h',
    'build/ios/Legacy/Protocols/{EXInternalModule,EXModuleRegistryConsumer}.h',
    'build/ios/Legacy/ModuleRegistry/*.h',
    'build/ios/Legacy/EXExportedModule.h',
    'build/ios/Legacy/Services/Permissions/EXPermissionsService.h',
    'build/ios/Core/Modules/CoreModuleHelper.h',
    'build/ios/JS/EXJSIInstaller.h',
    'build/ios/JS/EXJSUtils.h',
    'build/ios/JS/EXSharedObjectUtils.h'
  ]
  s.private_header_files = [
    'build/ios/JSI/**/*.h',
    'build/common/cpp/**/*.h'
  ]

  s.dependency 'RNWExpoModulesJSI'
  s.dependency 'ReactNativeWatchOSCxx'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited) EXPO_MODULES_CORE_HEADLESS',
    'GCC_PREPROCESSOR_DEFINITIONS' => "$(inherited) EXPO_MODULES_CORE_VERSION=#{core_version} EXPO_MODULES_CORE_HEADLESS=1",
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
