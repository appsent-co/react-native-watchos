import { createNativeView } from '../createNativeView';
import type { UnitPoint } from './LinearGradient';

export interface RadialGradientProps {
  colors: string[];
  center: UnitPoint;
  startRadius: number;
  endRadius: number;
}

export const RadialGradient =
  createNativeView<RadialGradientProps>('RadialGradient');
