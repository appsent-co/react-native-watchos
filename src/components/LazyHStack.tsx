import { createNativeView } from '../createNativeView';

export interface LazyHStackProps {
  /// Vertical alignment of children. Defaults to `'center'`.
  alignment?:
    | 'top'
    | 'center'
    | 'bottom'
    | 'firstTextBaseline'
    | 'lastTextBaseline';
  /// Distance between children. Defaults to the system spacing.
  spacing?: number;
  /// Which section subviews stay pinned while scrolling.
  pinnedViews?: ('sectionHeaders' | 'sectionFooters')[];
}

export const LazyHStack = createNativeView<LazyHStackProps>('LazyHStack');
