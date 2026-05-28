require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

# Prebuilt RN runtime for watchOS — Hermes-less host (separate xcframework)
# plus JSI and the RN headers third-party modules expect.
#
# Linked into the watch target via CocoaPods (`use_watchos_modules!` in
# cocoapods/autolink.rb) — as a dependency of the `ReactNativeWatchOS` host
# pod, and directly by autolinked third-party RN modules, which pick up the
# same <React/...>, <jsi/...>, <ReactCommon/...> headers via standard
# CocoaPods dependency propagation.
#
# Headers are sourced from the watchos-arm64_arm64_32 device slice; the binary
# is linked via `vendored_frameworks` so the right slice is chosen per build.
Pod::Spec.new do |s|
  s.name           = 'ReactNativeWatchOSCxx'
  s.version        = package['version']
  s.summary        = 'Prebuilt React Native runtime (JSI + headers) for watchOS.'
  s.description    = <<~DESC
    Wraps the ReactNativeWatchOSCxx xcframework as a CocoaPod so that
    third-party RN modules autolinked into a watch target can include
    `<React/...>`, `<jsi/...>`, `<ReactCommon/...>` etc. via the normal
    CocoaPods header-search-path propagation.
  DESC
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.source         = { :git => package['repository']['url'], :tag => "v#{s.version}" }

  s.platform       = :watchos, '9.0'

  # Headers live inside the xcframework's `Headers/` tree:
  #   ReactNativeWatchOSCxx/   → `<ReactNativeWatchOSCxx/...>`
  #   react/                   → `<React/...>` (case-insensitive macOS FS) and `<react/...>`
  #   ReactCommon/             → `<ReactCommon/...>`
  #   jsi/                     → `<jsi/...>`
  #   RCTRequired/             → `<RCTRequired/...>`
  #   RCTTypeSafety/           → `<RCTTypeSafety/...>`
  #
  # `header_mappings_dir` preserves the subdir structure under
  # `Pods/Headers/Public/ReactNativeWatchOSCxx/`. Dependents get
  # `${PODS_ROOT}/Headers/Public/ReactNativeWatchOSCxx` in HEADER_SEARCH_PATHS
  # automatically — no post_install patching required.
  headers_root = 'build/xcframework/ReactNativeWatchOSCxx.xcframework/watchos-arm64_arm64_32/Headers'

  s.source_files         = "#{headers_root}/**/*.h"
  s.public_header_files  = "#{headers_root}/**/*.h"
  s.header_mappings_dir  = headers_root

  # Don't copy the framework's OWN module headers into Pods/Headers/Public —
  # the xcframework already exposes them via ${PODS_XCFRAMEWORKS_BUILD_DIR}/
  # ReactNativeWatchOSCxx/Headers. Copying them too made the same header
  # reachable by two paths; with no include guard, the module-map `header`
  # directive and a cross-header `#import` parsed it twice → "redefinition".
  # Only the <React/...>, <jsi/...> etc. trees need propagating here.
  s.exclude_files        = "#{headers_root}/ReactNativeWatchOSCxx/**/*"
  s.preserve_paths       = 'build/xcframework/ReactNativeWatchOSCxx.xcframework'
  s.vendored_frameworks  = 'build/xcframework/ReactNativeWatchOSCxx.xcframework'

  # JSI is C++; consumers must link libc++ since the static archive doesn't.
  s.libraries = 'c++'

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    # The xcframework's module.modulemap declares `module ReactNativeWatchOSCxx`
    # for the ObjC headers; suppress the warning when other headers (jsi, react)
    # are #include'd from inside that module.
    'CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER' => 'NO',
  }
end
