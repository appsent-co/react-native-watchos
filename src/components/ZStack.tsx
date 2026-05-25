import { createNativeView } from '../createNativeView';

export interface ZStackProps {
  /// Where to anchor children that are smaller than the stack frame.
  /// Defaults to `'center'`.
  alignment?:
    | 'leading'
    | 'trailing'
    | 'top'
    | 'bottom'
    | 'center'
    | 'topLeading'
    | 'topTrailing'
    | 'bottomLeading'
    | 'bottomTrailing';
}

export const ZStack = createNativeView<ZStackProps>('ZStack');
