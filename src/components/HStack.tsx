import { createNativeView } from '../createNativeView';

export interface HStackProps {
  /// Vertical alignment of children. Defaults to `'center'`.
  alignment?:
    | 'top'
    | 'center'
    | 'bottom'
    | 'firstTextBaseline'
    | 'lastTextBaseline';
  /// Distance between children. Defaults to the system spacing.
  spacing?: number;
}

export const HStack = createNativeView<HStackProps>('HStack');
