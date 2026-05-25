import { createNativeView } from '../createNativeView';

export interface GridProps {
  /// Alignment of each cell within its grid position. Defaults to `'center'`.
  alignment?:
    | 'leading'
    | 'trailing'
    | 'center'
    | 'top'
    | 'bottom'
    | 'topLeading'
    | 'topTrailing'
    | 'bottomLeading'
    | 'bottomTrailing';
  /// Horizontal distance between columns. Defaults to the system spacing.
  horizontalSpacing?: number;
  /// Vertical distance between rows. Defaults to the system spacing.
  verticalSpacing?: number;
}

export const Grid = createNativeView<GridProps>('Grid');
