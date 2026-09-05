---
title: Secure Storage
sidebar_position: 5
---

# Secure Storage

`SecureStorage` is a small Keychain-backed key/value store for secrets —
the kind of thing a watch app has nowhere else to put: a device key seed,
an OAuth token blob. It is the second native module shipped by
`@appsent-co/react-native-watchos`, compiled from the same podspec as
[Watch Connectivity](./watch-connectivity), so the **same import works in
the iOS host app and in the watchOS app**; each side stores into its own
app's Keychain.

Use `Uint8Array` through `getBytes` / `setBytes`, or the compatible base64
methods. The native bridge carries base64; the Keychain stores decoded bytes.

## Usage

```ts
import { SecureStorage } from '@appsent-co/react-native-watchos/secure-storage';

const seed = crypto.getRandomValues(new Uint8Array(32));
await SecureStorage.setBytes('device.seed', seed);
const stored = await SecureStorage.getBytes('device.seed'); // Uint8Array | null
await SecureStorage.removeItem('device.seed');
```

| Method | Description |
| --- | --- |
| `getBytes(key)` | Resolves with a new `Uint8Array`, or `null` when absent. |
| `setBytes(key, bytes)` | Stores exactly the bytes in the view, including an empty view. |
| `getItem(key)` | Resolves with base64, or `null` when absent. |
| `setItem(key, base64)` | Creates or overwrites; rejects with `invalid_base64` if decoding fails. |
| `removeItem(key)` | Deletes the item; removing an absent key resolves. |

Byte conversion uses the runtime's `atob` / `btoa` globals (see
[Runtime globals](./runtime-globals)). An empty value is distinct from an
absent key. Keychain failures reject with `keychain_error` and the `OSStatus`
in the message; missing or unexpanded access-group configuration rejects with
`keychain_configuration_error` before accessing the Keychain.

## Access-group configuration and existing values

Every operation explicitly uses the group in the app's
`RNWSecureStorageAccessGroup` Info.plist key. Omitting `kSecAttrAccessGroup`
from a lookup, update, or deletion searches **all accessible groups**, even
though an add without it chooses only the default group. Putting the private
group first in an entitlement list therefore does not isolate CRUD operations.

The Expo plugin adds this key to the iOS app's Info.plist and the watch
`targets/<name>/Info.plist`. `init` uses the same watch helper. For a JSON
watch target config, the helper selects the first `keychain-access-groups`
entry, matching where earlier versions wrote values. If that JSON omits
entitlements, an existing target entitlements plist supplies the group instead
and is preserved by setup. The iOS plugin uses
`ios.entitlements` for the same selection. With no group list, it uses
`$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)`, expanded by Xcode.
Existing explicit Info.plist values are preserved.

For a dynamic `expo-target.config.js`, set the key yourself in the watch
Info.plist: the plugin warns and leaves the setting unset rather than
re-evaluating the config or guessing the group. The app still builds; storage
calls reject until the setting is supplied.
For direct native integration, add the key to each app target's Info.plist:

```xml
<key>RNWSecureStorageAccessGroup</key>
<string>$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)</string>
```

Use that expression only if the app previously used its private default group.
If it used Keychain Sharing, set the **original first group** instead, and
retain the matching signing entitlement. If another plugin or native build
configuration supplies the entitlements, set the key explicitly rather than
relying on Expo's inferred value. Inspect the built Info.plist to confirm
that Xcode expanded the value. A group not allowed by the app's signing
entitlements fails with a Keychain error.

The module does not move or delete values across groups. Changing this setting
changes which store is visible. Earlier broad lookups could also have returned
an item in a different accessible group; that item will no longer be returned.
Recover such items using an explicitly scoped migration in the owning app.
Do not switch an existing shared store to a private group without migrating
its values first. Missing configuration fails clearly rather than silently
selecting a new store. watchOS has no `SecTask` entitlement API, so the native
module neither parses signing files nor infers an App ID prefix.

## Keychain attributes and why

Every item is a `kSecClassGenericPassword` under the service
`co.appsent.reactnativewatchos.securestorage`, with your key as the
account. The service name is a compile-time constant: changing it would
orphan everything already stored.

- **`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.** The value has
  to survive reboots (a watch reboots and the app must reconnect without
  re-onboarding), has to be readable while the app runs unattended after the first
  user unlock following a reboot (for example, a background refresh on the charger), and must never
  leave the device — a backup or iCloud-Keychain copy restored onto a
  second device would clone a device identity. Before that first unlock, reads fail. `WhenUnlocked…` fails the
  unattended read, `WhenPasscodeSet…` ties the secret to a passcode the
  user can remove, and any non-`ThisDeviceOnly` class can be restored
  elsewhere.
- **`kSecAttrSynchronizable = false`**, set on writes and lookups alike,
  so the query is unambiguous.
- **Explicit `kSecAttrAccessGroup`** on additions, lookups, updates, and
  deletions. The private group isolates the app; an explicitly selected
  shared group intentionally permits other entitled apps to access it.

Two consequences worth knowing: a `ThisDeviceOnly` item is not restored
from a backup, and a Keychain item **outlives an app uninstall** — on the
watchOS simulator a value written by one install was read back by the
next (`secure-storage-persist: persisted` in the example's runtime probe).
Call `removeItem` yourself when a reinstall or a sign-out must forget the
secret; for a device identity that is the difference between a fresh one
and the old one coming back.

## Simulator builds need an entitlements file

The simulator's Keychain requires the app to carry an
`application-identifier` entitlement. Xcode synthesises it for an ad-hoc
signed simulator build, but only when the target has a
`CODE_SIGN_ENTITLEMENTS` file — without one every `SecItem*` call fails
with `OSStatus -34018` (*A required entitlement isn't present*), and so
does a build with `CODE_SIGNING_ALLOWED=NO`. With `@bacons/apple-targets`
an empty entitlements dict is enough:

```json
// targets/watch/expo-target.config.json
{ "type": "watch", "entitlements": {} }
```

`expo prebuild` writes `targets/watch/generated.entitlements` from it and
points the watch target at the file. A device build gets the entitlement
from its provisioning profile regardless.

You should not have to write this yourself: `npx react-native-watchos init`
adds the key when it scaffolds the target, and the config plugin adds it to
a JSON target config that lacks it on every `expo prebuild` — with one
caveat: `@bacons/apple-targets` reads the target config before any plugin
mod runs, so a key the plugin had to add is picked up by the **next**
prebuild (the plugin says so when it happens). A `expo-target.config.js` is
left alone; add the key by hand there. Should a call still fail with
`-34018`, the rejection message names this section.

Source: [`src/secureStorage/`](https://github.com/appsent-co/react-native-watchos/tree/main/src/secureStorage)
(JS) and
[`apple/Sources/SecureStorage/`](https://github.com/appsent-co/react-native-watchos/tree/main/apple/Sources/SecureStorage)
(native). The module is also the worked example in
[TurboModules](./native/turbo-modules).
