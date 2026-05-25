import { createNativeView } from '../createNativeView';

export interface VStackProps {
  /// Horizontal alignment of children. Defaults to `'center'`.
  alignment?: 'leading' | 'center' | 'trailing';
  /// Distance between children. Defaults to the system spacing.
  spacing?: number;
}

export const VStack = createNativeView<VStackProps>('VStack');
