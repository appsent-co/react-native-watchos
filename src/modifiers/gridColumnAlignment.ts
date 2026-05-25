import { createModifier } from './createModifier';

/// Horizontal alignment guide for a `Grid` column.
export type GridColumnAlignmentGuide = 'leading' | 'center' | 'trailing';

export interface GridColumnAlignmentParams {
  /// The horizontal alignment to apply to the whole column this cell sits
  /// in.
  alignment: GridColumnAlignmentGuide;
}

/// SwiftUI `.gridColumnAlignment(_:)`. Overrides the horizontal alignment
/// for the entire `Grid` column containing the modified cell.
export function gridColumnAlignment(
  params: GridColumnAlignmentParams
): ReturnType<typeof createModifier>;
export function gridColumnAlignment(
  alignment: GridColumnAlignmentGuide
): ReturnType<typeof createModifier>;
export function gridColumnAlignment(
  a: GridColumnAlignmentParams | GridColumnAlignmentGuide
) {
  if (typeof a === 'string') {
    return createModifier('gridColumnAlignment', { alignment: a });
  }
  return createModifier('gridColumnAlignment', a);
}
