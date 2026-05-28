require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

# The Swift host + SwiftUI bridge for watchOS — the app-facing API
# (`ReactNativeWatchOSView`, `ReactNativeWatchOSHost`, the view/modifier
# registry). Replaces the local Swift Package: same `import ReactNativeWatchOS`
# surface, now delivered through CocoaPods so it links into the watch target
# exactly once (the SPM + pod double-link produced a duplicate
# `module ReactNativeWatchOSCxx`).
#
# Added to the watch target by `use_watchos_modules!` (cocoapods/autolink.rb).
# Pulls in:
#   * ReactNativeWatchOSCxx — the prebuilt JSI / RN host xcframework + headers
#     (the only non-system module the Swift sources import).
#   * hermes.xcframework    — the JS engine; a *dynamic* framework, so
#     `vendored_frameworks` embeds it into the consuming watch app.
Pod::Spec.new do |s|
  s.name           = 'ReactNativeWatchOS'
  s.version        = package['version']
  s.summary        = 'Swift host + SwiftUI bridge for React Native on watchOS.'
  s.description    = <<~DESC
    The Swift side of @appsent-co/react-native-watchos: the SwiftUI view and
    modifier registry plus the `ReactNativeWatchOSHost` / `ReactNativeWatchOSView`
    entry points that mount the React Native runtime in a watchOS app.
  DESC
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.source         = { :git => package['repository']['url'], :tag => "v#{s.version}" }

  s.platform       = :watchos, '9.0'
  s.swift_version  = '5.9'

  s.source_files   = 'apple/Sources/ReactNativeWatchOS/**/*.swift'

  # The C++ runtime (JSI + RNWHermesHost + ReactCommon) and the RN headers the
  # host's `import ReactNativeWatchOSCxx` resolves against.
  s.dependency 'ReactNativeWatchOSCxx'

  # Hermes is a dynamic framework — vendoring it here embeds it into the watch
  # app bundle. The xcframework already ships a fat watchos-arm64_arm64_32
  # device slice plus a watchos-arm64 simulator slice.
  s.vendored_frameworks = 'build/xcframework/hermes.xcframework'

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
  }

  # The watch target builds arm64 only on the simulator (Apple Silicon); the
  # vendored slices carry no x86_64. Previously injected onto the app target by
  # the (now removed) withSPMPackage plugin.
  s.user_target_xcconfig = {
    'EXCLUDED_ARCHS[sdk=watchsimulator*]' => 'x86_64',
  }
end
