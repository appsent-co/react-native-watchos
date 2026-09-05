import NativeSecureStorage from '../specs/NativeSecureStorage';

// Hermes and React Native provide these globals; this package has no DOM lib.
declare function atob(value: string): string;
declare function btoa(value: string): string;

export const SecureStorage = {
  /** Stored bytes, or `null` when the key is absent. */
  async getBytes(key: string): Promise<Uint8Array | null> {
    const value = await NativeSecureStorage.getItem(key);
    if (value == null) return null;
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },

  /** Stores exactly the bytes in this view, including an empty view. */
  async setBytes(key: string, value: Uint8Array): Promise<void> {
    let binary = '';
    for (let i = 0; i < value.length; i++) {
      binary += String.fromCharCode(value[i]!);
    }
    await NativeSecureStorage.setItem(key, btoa(binary));
  },

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
