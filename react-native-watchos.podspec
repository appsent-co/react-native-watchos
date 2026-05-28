# Alias podspec — re-exports the RNWatchConnectivity spec.
#
# Expo's autolinker (`expo-modules-autolinking`) resolves a package's iOS
# podspec by matching a root `*.podspec` whose basename equals the package
# directory name (`react-native-watchos`), and it IGNORES the `podspecPath`
# declared in `react-native.config.js`. Without this file it falls back to
# the alphabetically-first root podspec — which is `ReactNativeWatchOSCxx`
# (the prebuilt-runtime pod) — and tries to compile that into the iOS app.
#
# This alias matches the package name exactly, so expo deterministically
# resolves the autolinkable WatchConnectivity module instead. CocoaPods then
# installs it via the real `RNWatchConnectivity.podspec` (same directory),
# which `:path` resolution finds by `<spec.name>.podspec`.
real = File.join(__dir__, 'RNWatchConnectivity.podspec')
eval(File.read(real), binding, real) # rubocop:disable Security/Eval
