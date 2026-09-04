import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Every `Native*.ts` in this directory lands in the one codegen umbrella
// (`RNWatchConnectivitySpec.h`) on both platforms. base64 at the boundary:
// codegen has no byte-array type. `removeItem`, not `delete`: a C++ keyword.

export interface Spec extends TurboModule {
  /** base64 of the stored bytes, or null when the key is absent. */
  getItem(key: string): Promise<string | null>;
  /** Creates or overwrites. Rejects with `invalid_base64` on a bad value. */
  setItem(key: string, base64: string): Promise<void>;
  /** Idempotent: removing an absent key resolves. */
  removeItem(key: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNWSecureStorage');
