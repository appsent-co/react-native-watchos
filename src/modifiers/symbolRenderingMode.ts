import { createModifier } from './createModifier';

export type SymbolRenderingMode =
  | 'monochrome'
  | 'hierarchical'
  | 'palette'
  | 'multicolor';

/// SwiftUI `.symbolRenderingMode(_:)`. Picks the colour-rendering strategy
/// for SF Symbols inside the view (`SymbolRenderingMode`).
export function symbolRenderingMode(mode: SymbolRenderingMode) {
  return createModifier('symbolRenderingMode', { mode });
}
