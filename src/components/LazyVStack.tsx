import { createNativeView } from '../createNativeView';

export interface LazyVStackProps {
  /// Horizontal alignment of children. Defaults to `'center'`.
  alignment?: 'leading' | 'center' | 'trailing';
  /// Distance between children. Defaults to the system spacing.
  spacing?: number;
  /// Which section subviews stay pinned while scrolling.
  pinnedViews?: ('sectionHeaders' | 'sectionFooters')[];
}

export const LazyVStack = createNativeView<LazyVStackProps>('LazyVStack');
