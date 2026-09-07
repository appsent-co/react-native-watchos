require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
versions = JSON.parse(File.read(File.join(__dir__, 'expo-modules/versions.json')))

# Optional adapter; the base ReactNativeWatchOS pod remains Expo-free.
Pod::Spec.new do |s|
  s.name = 'ReactNativeWatchOSExpo'
  s.version = package['version']
  s.summary = 'Opt-in non-UI Expo Modules runtime for React Native on watchOS.'
  s.license = package['license']
  s.author = package['author']
  s.homepage = package['homepage']
  s.source = { :git => package['repository']['url'], :tag => "v#{s.version}" }
  s.platform = :watchos, versions.fetch('watchos')
  s.swift_version = '5.9'
  s.static_framework = true
  s.source_files = 'apple/Sources/ReactNativeWatchOSExpo/**/*.{swift,h,mm}'
  s.public_header_files = 'apple/Sources/ReactNativeWatchOSExpo/include/**/*.h'
  s.dependency 'ReactNativeWatchOS', s.version.to_s
  s.dependency 'RNWExpoModulesCore', versions.fetch('expo-modules-core')
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xcc -fmodule-map-file=${PODS_XCFRAMEWORKS_BUILD_DIR}/ReactNativeWatchOSCxx/Headers/module.modulemap',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
  }
  # The app discovers the Objective-C-visible factory by its stable class name.
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '$(inherited) -ObjC',
  }
end
