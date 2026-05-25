import { createModifier } from './createModifier';

export type RenderingMode = 'original' | 'template' | 'automatic';

/// SwiftUI `.renderingMode(_:)`. Image-only.
/// - `'template'` recolours the image with the current `foregroundColor`
/// - `'original'` keeps the source colours
/// - `'automatic'` (default) defers to SwiftUI's default for the asset
export function renderingMode(mode: RenderingMode = 'automatic') {
  return createModifier('renderingMode', { mode });
}
