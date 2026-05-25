import { createModifier } from './createModifier';

/// A named anchor point, or an explicit unit point in the 0...1 space
/// (`{ x: 0, y: 0 }` is the top-leading corner, `{ x: 1, y: 1 }` is
/// bottom-trailing).
export type GridCellAnchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'leading'
  | 'trailing'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing'
  | { x: number; y: number };

export interface GridCellAnchorParams {
  /// The unit point within the cell that the view is anchored to.
  anchor: GridCellAnchor;
}

/// SwiftUI `.gridCellAnchor(_:)`. Positions a view within its `Grid` cell
/// (overriding the grid's default alignment for that one cell).
export function gridCellAnchor(
  params: GridCellAnchorParams
): ReturnType<typeof createModifier>;
export function gridCellAnchor(
  anchor: GridCellAnchor
): ReturnType<typeof createModifier>;
export function gridCellAnchor(a: GridCellAnchorParams | GridCellAnchor) {
  if (typeof a === 'object' && a !== null && 'anchor' in a) {
    return createModifier('gridCellAnchor', a);
  }
  return createModifier('gridCellAnchor', { anchor: a });
}
