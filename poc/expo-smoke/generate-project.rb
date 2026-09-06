#!/usr/bin/env ruby
require 'fileutils'
require 'json'
require 'xcodeproj'

root = File.expand_path('../..', __dir__)
output = File.join(root, 'build/poc/expo-smoke')
versions = JSON.parse(File.read(File.join(root, 'expo-modules/versions.json')))
FileUtils.mkdir_p(output)

# Xcode's generated Info.plist does not emit arbitrary INFOPLIST_KEY_* values.
# Use a real input plist, as the production plugin does, for the runtime factory.
info_plist = File.join(output, 'Info.plist')
Xcodeproj::Plist.write_to_path({
  'CFBundleDevelopmentRegion' => 'en',
  'CFBundleDisplayName' => 'Expo Smoke',
  'CFBundleExecutable' => '$(EXECUTABLE_NAME)',
  'CFBundleIdentifier' => '$(PRODUCT_BUNDLE_IDENTIFIER)',
  'CFBundleInfoDictionaryVersion' => '6.0',
  'CFBundleName' => '$(PRODUCT_NAME)',
  'CFBundlePackageType' => 'APPL',
  'CFBundleShortVersionString' => '$(MARKETING_VERSION)',
  'CFBundleVersion' => '$(CURRENT_PROJECT_VERSION)',
  'WKApplication' => true,
  'WKWatchOnly' => true,
  'RNWRuntimeBindingFactory' => 'RNWExpoRuntimeBindingFactory',
}, info_plist)

# A real local Expo package makes the smoke exercise SDK search, metadata
# validation, pod installation, and provider generation used by consumer apps.
module_root = File.join(output, 'node_modules/rnw-expo-modules-proof')
FileUtils.mkdir_p(module_root)
File.write(File.join(output, 'package.json'), JSON.pretty_generate({
  'name' => 'rnw-expo-smoke-app',
  'version' => '1.0.0',
  'private' => true,
  'dependencies' => {
    'expo' => versions.fetch('expo'),
    'react-native' => versions.fetch('react-native'),
    'react' => versions.fetch('react'),
    'rnw-expo-modules-proof' => '1.0.0',
  },
}) + "\n")
%w[expo react-native react].each do |name|
  destination = File.join(output, 'node_modules', name)
  FileUtils.rm_rf(destination)
  File.symlink(File.realpath(File.join(root, 'node_modules', name)), destination)
end
File.write(File.join(module_root, 'package.json'), JSON.pretty_generate({
  'name' => 'rnw-expo-modules-proof', 'version' => '1.0.0', 'private' => true,
}) + "\n")
File.write(File.join(module_root, 'expo-module.config.json'), JSON.pretty_generate({
  'platforms' => ['watchos'],
  'watchos' => {
    'modules' => ['RNWExpoModulesProof'],
    'swiftModuleName' => 'RNWExpoModulesProofFixture',
    'podspecPath' => 'RNWExpoModulesProofFixture.podspec',
  },
}) + "\n")
FileUtils.cp(File.join(__dir__, 'Sources/RNWExpoModulesProof.swift'), module_root)
File.write(File.join(module_root, 'RNWExpoModulesProofFixture.podspec'), <<~RUBY)
  Pod::Spec.new do |s|
    s.name = 'RNWExpoModulesProofFixture'
    s.module_name = 'RNWExpoModulesProofFixture'
    s.version = '1.0.0'
    s.summary = 'Native module fixture for RNW Expo integration smoke.'
    s.homepage = 'https://github.com/appsent-co/react-native-watchos'
    s.license = 'MIT'
    s.author = 'Appsent'
    s.source = { :git => 'https://github.com/appsent-co/react-native-watchos.git' }
    s.watchos.deployment_target = #{versions.fetch('watchos').inspect}
    s.swift_version = '5.9'
    s.source_files = 'RNWExpoModulesProof.swift'
    s.watchos.dependency 'RNWExpoModulesCore', #{versions.fetch('expo-modules-core').inspect}
  end
RUBY

project_path = File.join(output, 'ExpoSmoke.xcodeproj')
provider_path = File.join(output, 'RNWExpoModulesProvider.swift')
FileUtils.rm_rf(project_path)
project = Xcodeproj::Project.new(project_path)
target = project.new_target(:application, 'ExpoSmoke', :watchos, versions.fetch('watchos'))
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.appsent.rnw-expo-smoke',
    'PRODUCT_NAME' => 'ExpoSmoke',
    'SWIFT_VERSION' => '5.0',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'INFOPLIST_FILE' => info_plist,
    'MARKETING_VERSION' => '1.0',
    'CURRENT_PROJECT_VERSION' => '1',
    'TARGETED_DEVICE_FAMILY' => '4',
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
    'CODE_SIGN_IDENTITY[sdk=watchsimulator*]' => '-',
  })
end
source_paths = Dir[File.join(__dir__, 'Sources/*.{swift,mm}')].reject do |path|
  File.basename(path) == 'RNWExpoModulesProof.swift'
end
# CocoaPods writes this source using the production watchOS provider generator.
source_paths << provider_path
source_paths.each { |path| target.source_build_phase.add_file_reference(project.main_group.new_file(path)) }
target.resources_build_phase.add_file_reference(project.main_group.new_file(File.join(output, 'smoke.jsbundle')))
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, 'ExpoSmoke', true)

File.write(File.join(output, 'Podfile'), <<~RUBY)
  require #{File.join(root, 'cocoapods/expo_modules.rb').inspect}
  platform :watchos, #{versions.fetch('watchos').inspect}
  install! 'cocoapods', :deterministic_uuids => true
  use_frameworks! :linkage => :static
  target 'ExpoSmoke' do
    pod 'ReactNativeWatchOSCxx', :path => #{root.inspect}
    pod 'ReactNativeWatchOS', :path => #{root.inspect}
    use_watchos_expo_modules!(
      :project_root => #{output.inspect},
      :expo_provider => #{provider_path.inspect}
    )
  end
RUBY
puts "Generated #{project_path} with a real watchOS Expo module package"
