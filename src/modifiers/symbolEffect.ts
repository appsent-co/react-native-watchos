import { createModifier } from './createModifier';

export type SymbolEffectType =
  | 'bounce'
  | 'pulse'
  | 'variableColor'
  | 'scale'
  | 'appear'
  | 'disappear'
  | 'wiggle'
  | 'breathe'
  | 'rotate';

/// SwiftUI `.symbolEffect(_:)`. Applies an animated SF Symbol effect
/// (`SymbolEffect`). Requires watchOS 10+; `'wiggle'`, `'breathe'` and
/// `'rotate'` require watchOS 11+. On older systems the modifier is a
/// no-op (the view renders unchanged).
export function symbolEffect(effect: SymbolEffectType) {
  return createModifier('symbolEffect', { effect });
}
