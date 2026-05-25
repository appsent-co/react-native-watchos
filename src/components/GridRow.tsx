import { createNativeView } from '../createNativeView';

export interface GridRowProps {
  /// Vertical alignment of cells within this row. Defaults to the
  /// surrounding `Grid`'s alignment.
  alignment?: 'top' | 'center' | 'bottom' | 'firstTextBaseline' | 'lastTextBaseline';
}

export const GridRow = createNativeView<GridRowProps>('GridRow');
