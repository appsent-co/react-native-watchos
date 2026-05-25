import { createNativeView } from '../createNativeView';

export type UnitPointName =
  | 'top'
  | 'bottom'
  | 'leading'
  | 'trailing'
  | 'center'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export type UnitPoint = UnitPointName | { x: number; y: number };

export interface LinearGradientProps {
  colors: string[];
  startPoint: UnitPoint;
  endPoint: UnitPoint;
}

export const LinearGradient =
  createNativeView<LinearGradientProps>('LinearGradient');
