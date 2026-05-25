import { createModifier } from './createModifier';

export interface BorderParams {
  /// Border color. Named (`'red'`), semantic (`'primary'`, `'accent'`), or
  /// `#RRGGBB` / `#RRGGBBAA`.
  color: string;
  /// Border width in points. Defaults to `1`, matching SwiftUI.
  width?: number;
}

/// SwiftUI `.border(_:width:)`. Draws a border of the given color and width
/// around the view's frame edges.
export function border(params: BorderParams): ReturnType<typeof createModifier>;
export function border(
  color: string,
  width?: number
): ReturnType<typeof createModifier>;
export function border(a: BorderParams | string, b?: number) {
  if (typeof a === 'string') return createModifier('border', { color: a, width: b });
  return createModifier('border', a);
}
