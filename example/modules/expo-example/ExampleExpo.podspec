Pod::Spec.new do |s|
  s.name = 'ExampleExpo'
  s.version = '1.0.0'
  s.summary = 'A local Expo module shared by the iPhone and watch example.'
  s.license = 'MIT'
  s.author = 'Appsent'
  s.homepage = 'https://github.com/appsent-co/react-native-watchos'
  s.source = { :git => s.homepage, :tag => s.version.to_s }
  s.platforms = { :ios => '16.4', :watchos => '9.4' }
  s.swift_version = '6.0'
  s.source_files = 'apple/**/*.swift'
  s.ios.dependency 'ExpoModulesCore'
  s.watchos.dependency 'RNWExpoModulesCore', '57.0.16'
end
