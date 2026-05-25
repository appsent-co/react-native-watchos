import { createNativeView } from '../createNativeView';
import type { GridItem } from '../types/GridItem';

export interface LazyHGridProps {
  /// One `GridItem` per row. Number of entries = number of rows.
  rows: GridItem[];
  /// Vertical alignment of cells whose height is less than the row.
  /// Defaults to `'center'`.
  alignment?: 'top' | 'center' | 'bottom';
  /// Horizontal distance between columns. Defaults to the system spacing.
  spacing?: number;
  /// Which `Section` children stay pinned while scrolling. Empty by default.
  pinnedViews?: ('sectionHeaders' | 'sectionFooters')[];
}

export const LazyHGrid = createNativeView<LazyHGridProps>('LazyHGrid');
