# Native integration regression fixture

The original Expo proof has been promoted into the optional production
integration under [`expo-modules`](../expo-modules) and
[`apple/Sources/ReactNativeWatchOSExpo`](../apple/Sources/ReactNativeWatchOSExpo).
It uses the installed Expo packages with a version-pinned source port, without
an Expo repository fork or edits to `node_modules`.

[`expo-smoke`](./expo-smoke/README.md) remains the native regression fixture. It
uses the shipped runtime adapter, real Expo package discovery/provider
generation, and a Metro bundle importing `expo-modules-core`. It exercises
module calls, events, converters, shared objects, reloads, pending async cleanup,
and isolation of direct Expo JSI modules across two hosts.

See [the user guide](../docs/docs/native/expo-modules.md) for setup and the
supported non-UI surface. The release gate also installs the npm tarball into a
fresh Expo app through `scripts/test-expo-consumer.cjs`.
