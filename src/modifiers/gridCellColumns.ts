import { createModifier } from './createModifier';

export interface GridCellColumnsParams {
  /// Number of columns this cell should span.
  count: number;
}

/// SwiftUI `.gridCellColumns(_:)`. Tells the enclosing `Grid` that a view
/// spans `count` columns.
export function gridCellColumns(
  params: GridCellColumnsParams
): ReturnType<typeof createModifier>;
export function gridCellColumns(
  count: number
): ReturnType<typeof createModifier>;
export function gridCellColumns(a: GridCellColumnsParams | number) {
  if (typeof a === 'number') {
    return createModifier('gridCellColumns', { count: a });
  }
  return createModifier('gridCellColumns', a);
}
