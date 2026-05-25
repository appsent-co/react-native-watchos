import { createNativeView } from '../createNativeView';

export interface ScrollViewProps {
  /// Which scroll axes to enable. Defaults to `'vertical'`.
  axes?: 'vertical' | 'horizontal' | 'both';
  /// Whether to display the scroll indicators. Defaults to `true`.
  showsIndicators?: boolean;
}

export const ScrollView = createNativeView<ScrollViewProps>('ScrollView');
