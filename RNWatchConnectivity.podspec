require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RNWatchConnectivity'
  s.version        = package['version']
  s.summary        = 'React Native bridge for Apple WatchConnectivity (WCSession).'
  s.description    = <<~DESC
    Exposes Apple's WatchConnectivity (WCSession) framework to JavaScript
    on both the iOS host app and its paired watchOS app. Same TurboModule,
    same JS API, autolinked on both platforms.
  DESC
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.source         = { :git => package['repository']['url'], :tag => "v#{s.version}" }

  # Both platforms are declared:
  #   * `:ios`     — picked up by standard RN autolinking via
  #                  `react-native config`, compiles into the host app.
  #   * `:watchos` — picked up by this package's `use_watchos_modules!`
  #                  (cocoapods/autolink.rb), compiles into the watch
  #                  target. Same sources, two consumers.
  s.platforms      = { :ios => '15.0', :watchos => '9.0' }

  s.source_files   = [
    'apple/Sources/WatchConnectivity/RNWWatchConnectivity.mm',
    'apple/Sources/WatchConnectivity/RNWWatchConnectivity.h',
  ]
  s.public_header_files = [
    'apple/Sources/WatchConnectivity/RNWWatchConnectivity.h',
  ]

  # WatchConnectivity is a system framework available on both platforms.
  s.frameworks     = 'WatchConnectivity'

  # iOS slice deps. Each scoped to `:ios` so `pod install` doesn't try
  # to apply them to the watch target (most of these are iOS-only — the
  # watch slice gets the equivalent symbols from the prebuilt
  # ReactNativeWatchOSCxx xcframework instead).
  #
  # - React-Core: RCTBridgeModule, RCTEventEmitter
  # - ReactCommon/turbomodule/core: <ReactCommon/RCTTurboModule.h>
  # - ReactCodegen: <NativeWatchConnectivitySpecJSI> + the spec header
  s.ios.dependency 'React-Core'
  s.ios.dependency 'ReactCommon/turbomodule/core'
  s.ios.dependency 'ReactCodegen'

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) RCT_NEW_ARCH_ENABLED=1',
  }

  # Watch slice pulls `<React/...>`, `<jsi/...>`, `<ReactCommon/...>` and
  # `<ReactNativeWatchOSCxx/...>` from the `ReactNativeWatchOSCxx` pod
  # (which vendors our prebuilt xcframework). The only extra search path
  # we still need is the watchOS codegen output written by
  # `withWatchTurboModuleCodegen`, which lives outside any pod.
  s.watchos.dependency 'ReactNativeWatchOSCxx'
  s.watchos.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) RCT_NEW_ARCH_ENABLED=1',
    'HEADER_SEARCH_PATHS' => '$(inherited) ' \
      '"${PODS_ROOT}/../build/generated/watchos-codegen-libs/RNWatchConnectivitySpec" ' \
      '"${PODS_ROOT}/../build/generated/watchos-codegen-libs/RNWatchConnectivitySpec/RNWatchConnectivitySpec"',
  }

  s.compiler_flags = '-fobjc-arc-exceptions'
end
