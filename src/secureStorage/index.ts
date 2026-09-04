// Keychain-backed store for small secrets on the watch and, through the same
// podspec, on the iOS host app. Values are base64 strings at the boundary
// (codegen has no byte-array type); the stored item is the decoded bytes, in
// a generic-password item scoped to the calling app and never synchronised.
// Native: `apple/Sources/SecureStorage/`; docs: docs/docs/secure-storage.md.
//
//   import { SecureStorage } from '@appsent-co/react-native-watchos/secure-storage';
//
//   await SecureStorage.setItem('device.seed', btoa(binary));
//   const b64 = await SecureStorage.getItem('device.seed'); // null when absent
//   await SecureStorage.removeItem('device.seed');

import NativeSecureStorage from '../specs/NativeSecureStorage';

export const SecureStorage = {
  /** base64 of the stored bytes, or `null` when the key is absent. */
  async getItem(key: string): Promise<string | null> {
    const value = await NativeSecureStorage.getItem(key);
    return value ?? null;
  },

  /** Creates or overwrites `key`. Rejects with code `invalid_base64` when
   *  `base64` does not decode, and `keychain_error` (message carries the
   *  OSStatus) when the Keychain refuses the write. */
  setItem(key: string, base64: string): Promise<void> {
    return NativeSecureStorage.setItem(key, base64);
  },

  /** Idempotent — removing an absent key resolves. */
  removeItem(key: string): Promise<void> {
    return NativeSecureStorage.removeItem(key);
  },
};

export default SecureStorage;
