# Prebuilt watchOS port of the version-pinned Expo Modules JSI sources.
Pod::Spec.new do |s|
  s.name = 'RNWExpoModulesJSI'
  s.module_name = 'ExpoModulesJSI'
  s.version = '57.0.8'
  s.summary = 'Non-UI watchOS build of Expo Modules JSI.'
  s.homepage = 'https://github.com/expo/expo/tree/main/packages/expo-modules-jsi'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.author = '650 Industries, Inc.'
  s.source = { :git => 'https://github.com/expo/expo.git' }
  s.platform = :watchos, '9.4'
  s.swift_version = '6.0'
  framework = 'build/ExpoModulesJSI.xcframework'
  s.vendored_frameworks = framework
  s.preserve_paths = framework
  s.dependency 'ReactNativeWatchOSCxx'
  s.libraries = 'c++'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
  }
end
