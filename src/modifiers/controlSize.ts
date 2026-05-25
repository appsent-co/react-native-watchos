import { createModifier } from './createModifier';

export type ControlSize =
  | 'mini'
  | 'small'
  | 'regular'
  | 'large'
  | 'extraLarge';

/// SwiftUI `.controlSize(_:)`. Scales controls (buttons, toggles, …) within
/// the view to the given size. `'extraLarge'` requires watchOS 10+ and
/// falls back to `'large'` on older systems.
export function controlSize(style: ControlSize = 'regular') {
  return createModifier('controlSize', { style });
}
