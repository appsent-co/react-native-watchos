import { createNativeView } from '../createNativeView';

export interface RoundedRectangleProps {
  /// Corner radius in points. Required.
  cornerRadius: number;
  /// Corner curve style. Defaults to `'continuous'` (Apple's squircle).
  style?: 'circular' | 'continuous';
}

export const RoundedRectangle =
  createNativeView<RoundedRectangleProps>('RoundedRectangle');
