import { createNativeView } from '../createNativeView';

export type ViewThatFitsProps = {
  axes?: 'horizontal' | 'vertical' | 'both';
};

export const ViewThatFits = createNativeView<ViewThatFitsProps>('ViewThatFits');
