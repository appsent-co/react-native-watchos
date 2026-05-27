require 'json'
require 'open3'
require 'pathname'
require 'cocoapods-core'

# Scope RN's `install_modules_dependencies` to non-watchOS platforms.
# RN's injected deps (ReactCodegen, React-RCTFabric) don't declare
# `:watchos`, so a universal `spec.dependency` aborts `pod install`
# the moment a watchOS-targeted pod hits the resolver.
def _rnw_patch_install_modules_dependencies!
  return if $_rnw_install_modules_dependencies_patched
  return unless defined?(install_modules_dependencies)
  $_rnw_install_modules_dependencies_patched = true
  $_rnw_install_modules_dependencies_orig = method(:install_modules_dependencies)

  Object.send(:define_method, :install_modules_dependencies) do |spec, **kwargs|
    original_dependency = spec.method(:dependency)
    spec.define_singleton_method(:dependency) do |*args, **kw|
      platforms = available_platforms.map(&:name) - [:watchos]
      if platforms.empty?
        original_dependency.call(*args, **kw)
      else
        platforms.each { |p| send(p).dependency(*args, **kw) }
      end
    end
    begin
      $_rnw_install_modules_dependencies_orig.call(spec, **kwargs)
    ensure
      spec.define_singleton_method(:dependency, &original_dependency)
    end
  end
end

# Wrap the Podfile's `post_install` so every watchOS pod target picks
# up the prebuilt xcframework's `Headers/` dirs in `HEADER_SEARCH_PATHS`
# — autolinked pods include `<ReactCommon/CallInvoker.h>`, `<jsi/jsi.h>`,
# etc. The DSL allows only one `post_install` block, so we wrap any
# existing callback (typically RN's) instead of replacing it.
def _rnw_wrap_post_install!(podfile)
  return if $_rnw_post_install_wrapped
  $_rnw_post_install_wrapped = true

  xcframework_dir = File.expand_path(
    '../build/xcframework/ReactNativeWatchOSCxx.xcframework', __dir__
  )
  extra_header_paths = [
    "\"#{xcframework_dir}/watchos-arm64/Headers\"",
    "\"#{xcframework_dir}/watchos-arm64-simulator/Headers\"",
  ].join(' ')

  existing = podfile.instance_variable_get(:@post_install_callback)
  podfile.instance_variable_set(:@post_install_callback, nil)

  podfile.post_install do |installer|
    existing.call(installer) if existing

    installer.pod_targets.each do |pod_target|
      next unless pod_target.platform.name == :watchos
      xc_target = installer.pods_project.targets.find do |t|
        t.name == pod_target.label || t.name == pod_target.name
      end
      next unless xc_target&.respond_to?(:build_configurations)
      xc_target.build_configurations.each do |config|
        current = config.build_settings['HEADER_SEARCH_PATHS']
        base = current.is_a?(Array) ? current.join(' ') : (current || '$(inherited)')
        config.build_settings['HEADER_SEARCH_PATHS'] =
          "#{base} #{extra_header_paths}"
      end
    end
  end
end

# `use_watchos_modules!` — autolink third-party RN modules into a watch target.
#
# Designed to be called from inside a `target '<watch>' do ... end` block.
# Mirrors RN's `use_native_modules!` but filters to packages whose podspec
# declares `:watchos =>` in `s.platforms`. That declaration is the explicit
# opt-in signal from the package author that the pod is expected to compile
# against the watchOS SDK.
#
# Reuses the same `react-native config` invocation the iOS target uses so
# we share the dependency graph; the only divergence is the post-filter.
#
# Expo bare:                                        Bare RN:
#   targets/watch/pods.rb                             ios/Podfile
#   (auto-loaded by apple-targets extension)          (hand-managed)
#
# Both call the same method.
def use_watchos_modules!(opts = {})
  # Patch + wrap deferred until call time: at `require`-time the Podfile
  # is still being parsed and `Pod::Config.instance.podfile` re-enters.
  _rnw_patch_install_modules_dependencies!
  _rnw_wrap_post_install!(self)

  config_command = opts[:config_command] || [
    'npx', '--no-install', '@react-native-community/cli', 'config'
  ]

  # Splat the array straight to Open3 — joining with spaces and going through
  # the shell would mangle args that contain quoted Node expressions like
  # `require('expo/bin/autolinking')`.
  raw, status = Open3.capture2(*config_command)
  unless status.success? && !raw.strip.empty?
    Pod::UI.warn "[@appsent-co/react-native-watchos] autolink: `#{config_command.join(' ')}` produced no usable output; skipping"
    return
  end

  config = JSON.parse(raw)
  deps = config['dependencies'] || {}

  deps.each do |name, dep|
    podspec_path = dep.dig('platforms', 'ios', 'podspecPath')
    next unless podspec_path.is_a?(String) && File.exist?(podspec_path)

    # Pass through the path as-is from react-native config. Resolving
    # symlinks here would diverge from the iOS-side autolinker's declaration
    # of the same pod and CocoaPods would reject it as a duplicate source.
    # The caller MUST hand us the same `config_command` the iOS Podfile uses
    # so both invocations return byte-identical paths.

    spec = begin
      Pod::Specification.from_file(podspec_path)
    rescue StandardError => e
      Pod::UI.warn "[@appsent-co/react-native-watchos] autolink: could not load #{name} podspec (#{e.message}); skipping"
      next
    end

    # `available_platforms` returns Pod::Platform objects; `name` is the symbol.
    has_watchos = spec.available_platforms.any? { |p| p.name == :watchos }
    next unless has_watchos

    # `pod` requires the podspec's own `s.name`, not the npm package name —
    # they often differ (e.g. `react-native-worklets` → `RNWorklets`).
    # CocoaPods resolves `:path` by looking for `<spec.name>.podspec` there.
    #
    # Path MUST match the form the iOS autolinker used (relative to the
    # Pods installation root, i.e. `example/ios`). CocoaPods compares the
    # `:path` strings byte-for-byte when deduping — an absolute path here vs.
    # a relative path on the iOS side counts as two different sources for
    # the same pod and aborts the install.
    pods_root = Pathname.new(Pod::Config.instance.installation_root)
    relative_dir = Pathname.new(File.dirname(podspec_path))
                     .relative_path_from(pods_root)
                     .to_s
    Pod::UI.puts "[@appsent-co/react-native-watchos] autolinking #{name} as #{spec.name} (watchOS)"
    pod spec.name, :path => relative_dir
  end
end
