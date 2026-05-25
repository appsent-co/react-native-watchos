import { createModifier } from './createModifier';

/// The `Glass` material variant. `regular` is the default frosted glass;
/// `clear` is a more transparent variant; `identity` is a no-op pass-through
/// (useful for conditionally disabling the effect while keeping layout stable).
export type GlassVariant = 'regular' | 'clear' | 'identity';

/// The clipping shape the glass is rendered into. `roundedRectangle` reads
/// the optional `cornerRadius` param (defaults to 0).
export type GlassShape = 'capsule' | 'rect' | 'circle' | 'roundedRectangle';

export interface GlassEffectParams {
  /// Glass material variant. Defaults to `regular`.
  variant?: GlassVariant;
  /// Shape the glass is clipped to. Defaults to `capsule`.
  shape?: GlassShape;
  /// Corner radius — only used when `shape` is `roundedRectangle`.
  cornerRadius?: number;
}

/// SwiftUI `.glassEffect(_:in:)` (watchOS 26 "Liquid Glass"). Applies a
/// Liquid Glass background to the view, clipped to `shape`. No-op on
/// watchOS < 26 (the native side returns the view unchanged).
export function glassEffect(params: GlassEffectParams = {}) {
  return createModifier('glassEffect', params);
}
