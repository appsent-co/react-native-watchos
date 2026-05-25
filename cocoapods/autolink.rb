require 'json'
require 'open3'
require 'pathname'
require 'cocoapods-core'

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
