import { createNativeView } from '../createNativeView';
import type { GridItem } from '../types/GridItem';

export interface LazyVGridProps {
  /// One `GridItem` per column. Number of entries = number of columns.
  columns: GridItem[];
  /// Horizontal alignment of cells whose width is less than the column.
  /// Defaults to `'center'`.
  alignment?: 'leading' | 'center' | 'trailing';
  /// Vertical distance between rows. Defaults to the system spacing.
  spacing?: number;
  /// Which `Section` children stay pinned while scrolling. Empty by default.
  pinnedViews?: ('sectionHeaders' | 'sectionFooters')[];
}

export const LazyVGrid = createNativeView<LazyVGridProps>('LazyVGrid');
