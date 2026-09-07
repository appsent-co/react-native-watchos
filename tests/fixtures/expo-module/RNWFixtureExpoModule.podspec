Pod::Spec.new do |s|
  s.name = 'RNWFixtureExpoModule'
  s.module_name = 'RNWFixtureExpoModule'
  s.version = '1.0.0'
  s.summary = 'Release-gate fixture for Expo Modules on watchOS.'
  s.license = 'MIT'
  s.author = 'RNW test fixture'
  s.homepage = 'https://github.com/appsent-co/react-native-watchos'
  s.source = { :git => 'https://example.invalid/rnw-fixture.git', :tag => s.version.to_s }
  s.platforms = { :ios => '16.4', :watchos => '9.4' }
  s.swift_version = '6.0'
  s.source_files = 'apple/**/*.swift'

  # Keep Expo's iOS Core and the watchOS Core port in their respective
  # platform slices. A shared dependency would make CocoaPods select the
  # unsupported iOS runtime for the watch target.
  s.ios.dependency 'ExpoModulesCore'
  s.watchos.dependency 'RNWExpoModulesCore', '57.0.16'
end
