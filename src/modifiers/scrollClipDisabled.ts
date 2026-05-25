import { createModifier } from './createModifier';

/// SwiftUI `.scrollClipDisabled(_:)`. Controls whether a scrollable view
/// clips its content to its bounds. Gated to watchOS 10+ natively; a
/// no-op on older systems.
export function scrollClipDisabled(disabled = true) {
  return createModifier('scrollClipDisabled', { disabled });
}
