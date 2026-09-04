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

Values are base64 strings at the API boundary (codegen has no byte-array
type). What lands in the Keychain is the decoded bytes, as a
generic-password item scoped to the calling app.

## Import

```ts
import { SecureStorage } from '@appsent-co/react-native-watchos/secure-storage';
```

## Usage

```ts
// Store 32 bytes under a key.
const seed = crypto.getRandomValues(new Uint8Array(32));
let bin = '';
for (const b of seed) bin += String.fromCharCode(b);
await SecureStorage.setItem('device.seed', btoa(bin));

// Read them back — `null` when the key was never written.
const stored = await SecureStorage.getItem('device.seed');
if (stored !== null) {
  const bytes = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
}

// Forget them. Removing an absent key resolves too.
await SecureStorage.removeItem('device.seed');
```

`atob` / `btoa` are Hermes built-ins on the watch (see
[Runtime globals](./runtime-globals)), so no polyfill is involved.

## API reference

| Method | Description |
| --- | --- |
| `getItem(key)` | Resolves with the base64 of the stored bytes, or `null` when the key is absent. |
| `setItem(key, base64)` | Creates the item or overwrites its value. Rejects with code `invalid_base64` when the value does not decode. |
| `removeItem(key)` | Deletes the item. Idempotent — an absent key resolves. |

Any Keychain failure rejects with code `keychain_error` and the `OSStatus`
(plus Apple's message for it) in the error message.

## Storing bytes

Libraries that keep a secret as a `Uint8Array` — a sync SDK's device key,
say — usually expect a three-method store over bytes. This is that adapter,
with the base64 conversion at the edge:

```ts
import { SecureStorage } from '@appsent-co/react-native-watchos/secure-storage';

export const BytesStore = {
  async get(key: string): Promise<Uint8Array | null> {
    const raw = await SecureStorage.getItem(key);
    if (raw === null) return null;
    const bin = atob(raw);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },

  async set(key: string, value: Uint8Array): Promise<void> {
    let bin = '';
    for (let i = 0; i < value.length; i++) bin += String.fromCharCode(value[i]!);
    await SecureStorage.setItem(key, btoa(bin));
  },

  async delete(key: string): Promise<void> {
    await SecureStorage.removeItem(key);
  },
};
```

`get` returning `null` (rather than throwing) for an absent key is what
lets a caller generate a fresh secret on first launch.

## Keychain attributes and why

Every item is a `kSecClassGenericPassword` under the service
`co.appsent.reactnativewatchos.securestorage`, with your key as the
account. The service name is a compile-time constant: changing it would
orphan everything already stored.

- **`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.** The value has
  to survive reboots (a watch reboots and the app must reconnect without
  re-onboarding), has to be readable while the app runs unattended right
  after a reboot (a background refresh on the charger), and must never
  leave the device — a backup or iCloud-Keychain copy restored onto a
  second device would clone a device identity. This is the only
  accessibility class that satisfies all three: `WhenUnlocked…` fails the
  unattended read, `WhenPasscodeSet…` ties the secret to a passcode the
  user can remove, and any non-`ThisDeviceOnly` class can be restored
  elsewhere.
- **`kSecAttrSynchronizable = false`**, set on writes and lookups alike,
  so the query is unambiguous.
- **No `kSecAttrAccessGroup`.** The item lives in the app's *default*
  access group. For an app without a `keychain-access-groups` entitlement
  that is its application identifier (`<AppIDPrefix>.<bundle id>`), private
  to the app: the watch app's secrets are invisible to the phone app and
  vice versa, which is right — each is its own device with its own
  identity. **With a `keychain-access-groups` entitlement the default is
  the first entry of that list** (Apple's `SecItem.h`), and an item written
  there is readable by every app that shares the group — a device seed or
  a token blob would silently become shared. The module does not pin the
  private group itself: its exact name needs the app id prefix, and the
  entitlement is not readable at runtime on watchOS (no `SecTask`). So if
  you enable Keychain Sharing, keep
  `$(AppIdentifierPrefix)$(CFBundleIdentifier)` — the entry Xcode puts
  first when it adds the capability — at the top of the list and the item
  stays private. The example app declares no such entitlement, so the
  simulator runs only ever exercise the private case.

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
