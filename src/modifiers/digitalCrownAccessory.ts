import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export interface DigitalCrownAccessoryParams {
  /// View placed alongside the Digital Crown while the crown is in use
  /// (e.g. a value readout). Hoisted into a hidden content slot.
  content: ReactNode;
}

/// SwiftUI `.digitalCrownAccessory { … }` — shows an accessory view next to
/// the Digital Crown during interaction. Available on watchOS 9 (the
/// deployment floor).
export function digitalCrownAccessory(
  content: ReactNode
): ReturnType<typeof createModifier>;
export function digitalCrownAccessory(
  params: DigitalCrownAccessoryParams
): ReturnType<typeof createModifier>;
export function digitalCrownAccessory(
  arg: ReactNode | DigitalCrownAccessoryParams
) {
  if (arg != null && typeof arg === 'object' && 'content' in arg) {
    return createModifier('digitalCrownAccessory', arg);
  }
  return createModifier('digitalCrownAccessory', { content: arg as ReactNode });
}
