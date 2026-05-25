import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Phase C demo spec. `@react-native/codegen` picks this up from
// `codegenConfig.jsSrcsDir` (see example/package.json) and emits
// `NativeWatchInfoSpec.h` + `NativeWatchInfoSpec-generated.mm` under the
// configured output directory. The emitted spec class replaces the
// hand-written `NativeWatchInfoSpecJSI` in NativeWatchInfo.mm.
export interface Spec extends TurboModule {
  getModelName: () => string;
  getSystemName: () => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('WatchInfo');
