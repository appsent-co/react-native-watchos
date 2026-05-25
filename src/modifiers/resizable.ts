import { createModifier } from './createModifier';

/// SwiftUI `.resizable()`. Image-only — makes the image stretch to fill
/// the space allocated by layout (combined with `.aspectRatio` or a
/// `.frame`). Without this, SwiftUI renders the image at its intrinsic
/// pixel size.
export function resizable() {
  return createModifier('resizable');
}
