import { createModifier } from './createModifier';

/// Border shapes a button can adopt via `.buttonBorderShape(_:)`.
/// - `'circle'` requires watchOS 10+; on older systems it falls back to the
///   system default (`'automatic'`).
export type ButtonBorderShapeValue =
  | 'automatic'
  | 'capsule'
  | 'roundedRectangle'
  | 'circle';

/// SwiftUI `.buttonBorderShape(_:)`. Sets the shape used to draw a button's
/// border (most visible with bordered button styles).
export function buttonBorderShape(shape: ButtonBorderShapeValue = 'automatic') {
  return createModifier('buttonBorderShape', { shape });
}
