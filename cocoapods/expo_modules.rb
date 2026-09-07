require 'json'
require 'open3'
require 'pathname'
require 'cocoapods-core'

# Watch-only Expo integration. The iOS target keeps Expo's stock pods/provider.
def use_watchos_expo_modules!(opts = {})
  pods_root = Pathname.new(Pod::Config.instance.installation_root)
  package_root = Pathname.new(File.expand_path('..', __dir__))
  project_root = File.expand_path(opts.fetch(:project_root, pods_root.parent.to_s))
  provider = opts.fetch(:expo_provider) do
    raise '[RNW Expo modules] Pass :expo_provider with the generated RNWExpoModulesProvider.swift path.'
  end
  node = ENV.fetch('NODE_BINARY', 'node')
  command = [node, File.join(package_root, 'expo-modules/autolinking.cjs'), '--project-root', project_root, '--provider', provider]
  stdout, stderr, status = Open3.capture3(*command)
  raise "[RNW Expo modules] Discovery failed:\n#{stderr}" unless status.success?
  modules = JSON.parse(stdout).fetch('modules')
  versions = JSON.parse(File.read(File.join(package_root, 'expo-modules/versions.json')))

  # Validate every package before declaring any pods. A platform opt-in cannot
  # make iOS/UIKit-dependent sources or a stock Core dependency watch-compatible.
  specs = modules.map do |entry|
    spec = Pod::Specification.from_file(entry.fetch('podspecPath'))
    platform = spec.available_platforms.find { |item| item.name == :watchos }
    raise "[RNW Expo modules] #{entry.fetch('name')} podspec must declare watchOS support." unless platform
    consumer = spec.consumer(:watchos)
    dependency_names = consumer.dependencies.map { |dependency| dependency.name.split('/').first }
    unless dependency_names.include?('RNWExpoModulesCore')
      raise "[RNW Expo modules] #{spec.name} must depend on RNWExpoModulesCore for watchOS. Use s.watchos.dependency 'RNWExpoModulesCore'."
    end
    forbidden = dependency_names.select { |name| name == 'ExpoModulesCore' || name == 'ExpoModulesJSI' || name.start_with?('React-') || name == 'React' || name.include?('Fabric') }
    unless forbidden.empty?
      raise "[RNW Expo modules] #{spec.name} has unsupported watchOS dependencies: #{forbidden.join(', ')}. Scope iOS-only dependencies to s.ios."
    end
    if spec.module_name != entry.fetch('swiftModuleName')
      raise "[RNW Expo modules] #{spec.name} module_name #{spec.module_name} does not match watchos.swiftModuleName #{entry.fetch('swiftModuleName')}."
    end
    if Gem::Version.new(platform.deployment_target.to_s) < Gem::Version.new(versions.fetch('watchos'))
      raise "[RNW Expo modules] #{spec.name} must declare watchOS #{versions.fetch('watchos')} or newer."
    end
    [entry, spec]
  end
  names = specs.map { |_, spec| spec.name }
  raise '[RNW Expo modules] Multiple packages declare the same pod name.' unless names.uniq.length == names.length

  {
    'RNWExpoModulesJSI' => package_root.join('expo-modules/jsi'),
    'RNWExpoModulesCore' => package_root.join('expo-modules/core'),
    'ReactNativeWatchOSExpo' => package_root,
  }.each do |name, directory|
    pod name, :path => directory.relative_path_from(pods_root).to_s
  end
  specs.each do |entry, spec|
    directory = Pathname.new(File.dirname(entry.fetch('podspecPath')))
    Pod::UI.puts "[RNW Expo modules] Linking #{entry.fetch('name')} as #{spec.name}"
    pod spec.name, :path => directory.relative_path_from(pods_root).to_s
  end
  modules.map { |entry| entry.fetch('name') }
end
