import { createModifier } from './createModifier';

export interface ShadowParams {
  /// Shadow color. Named, semantic, or `#RRGGBB` / `#RRGGBBAA`. When
  /// omitted, SwiftUI uses its default translucent black shadow.
  color?: string;
  /// Blur radius of the shadow. Defaults to `0`.
  radius?: number;
  /// Horizontal offset. Defaults to `0`.
  x?: number;
  /// Vertical offset. Defaults to `0`.
  y?: number;
}

/// SwiftUI `.shadow(color:radius:x:y:)`. Draws a drop shadow behind the view.
export function shadow(params: ShadowParams = {}) {
  return createModifier('shadow', params);
}
