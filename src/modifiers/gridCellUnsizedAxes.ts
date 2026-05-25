import { createModifier } from './createModifier';

/// Axes along which the cell should NOT inflate to the row/column size.
export type GridCellUnsizedAxesValue = 'horizontal' | 'vertical' | 'both';

export interface GridCellUnsizedAxesParams {
  /// The axes to leave unsized. Use `'both'` to opt out of grid sizing on
  /// both axes (e.g. for a `Divider` that should keep its intrinsic size).
  axes: GridCellUnsizedAxesValue;
}

/// SwiftUI `.gridCellUnsizedAxes(_:)`. Prevents a cell from filling the
/// width/height the `Grid` would otherwise impose along the given axes.
export function gridCellUnsizedAxes(
  params: GridCellUnsizedAxesParams
): ReturnType<typeof createModifier>;
export function gridCellUnsizedAxes(
  axes: GridCellUnsizedAxesValue
): ReturnType<typeof createModifier>;
export function gridCellUnsizedAxes(
  a: GridCellUnsizedAxesParams | GridCellUnsizedAxesValue
) {
  if (typeof a === 'string') {
    return createModifier('gridCellUnsizedAxes', { axes: a });
  }
  return createModifier('gridCellUnsizedAxes', a);
}
