import { createModifier } from './createModifier';

export type ImageScale = 'small' | 'medium' | 'large';

/// SwiftUI `.imageScale(_:)`. Sets the relative size of SF Symbols and
/// other images drawn inside the view (`Image.Scale`).
export function imageScale(scale: ImageScale) {
  return createModifier('imageScale', { scale });
}
