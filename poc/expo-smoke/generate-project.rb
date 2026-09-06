#!/usr/bin/env ruby
require 'fileutils'
require 'xcodeproj'

root = File.expand_path('../..', __dir__)
output = File.join(root, 'build/poc/expo-smoke')
FileUtils.mkdir_p(output)
project_path = File.join(output, 'ExpoSmoke.xcodeproj')
FileUtils.rm_rf(project_path)
project = Xcodeproj::Project.new(project_path)
target = project.new_target(:application, 'ExpoSmoke', :watchos, '9.4')
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.appsent.rnw-expo-smoke',
    'PRODUCT_NAME' => 'ExpoSmoke',
    'SWIFT_VERSION' => '5.0',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'INFOPLIST_KEY_WKApplication' => 'YES',
    'INFOPLIST_KEY_WKWatchOnly' => 'YES',
    'INFOPLIST_KEY_CFBundleDisplayName' => 'Expo Smoke',
    'MARKETING_VERSION' => '1.0',
    'CURRENT_PROJECT_VERSION' => '1',
    'TARGETED_DEVICE_FAMILY' => '4',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
    'CODE_SIGN_IDENTITY[sdk=watchsimulator*]' => '-',
    'SWIFT_OBJC_BRIDGING_HEADER' => File.join(__dir__, 'Sources/Bridge.h'),
  })
end
source_paths = Dir[File.join(__dir__, 'Sources/*.{swift,mm}')]
source_paths << File.join(root, 'poc/expo-modules-core/Proof/RNWExpoModulesProof.swift')
source_paths.each { |path| target.source_build_phase.add_file_reference(project.main_group.new_file(path)) }
%w[smoke.js].each do |name|
  target.resources_build_phase.add_file_reference(project.main_group.new_file(File.join(__dir__, name)))
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, 'ExpoSmoke', true)

File.write(File.join(output, 'Podfile'), <<~RUBY)
  platform :watchos, '9.4'
  install! 'cocoapods', :deterministic_uuids => true
  use_frameworks! :linkage => :static
  target 'ExpoSmoke' do
    pod 'ReactNativeWatchOSCxx', :path => #{root.inspect}
    pod 'ReactNativeWatchOS', :path => #{root.inspect}
    pod 'RNWExpoModulesJSI', :path => #{File.join(root, 'poc/expo-modules-jsi').inspect}
    pod 'RNWExpoModulesCore', :path => #{File.join(root, 'poc/expo-modules-core').inspect}
  end
RUBY
puts "Generated #{project_path}"
