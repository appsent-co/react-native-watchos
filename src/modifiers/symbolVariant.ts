import { createModifier } from './createModifier';

export type SymbolVariant =
  | 'none'
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'fill'
  | 'slash';

/// SwiftUI `.symbolVariant(_:)`. Substitutes a stylistic variant for SF
/// Symbols inside the view (`SymbolVariants`).
export function symbolVariant(variant: SymbolVariant) {
  return createModifier('symbolVariant', { variant });
}
