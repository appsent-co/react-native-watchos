import { createNativeView } from '../createNativeView';
import type { UnitPoint } from './LinearGradient';

interface AngularGradientBaseProps {
  colors: string[];
  center: UnitPoint;
}

/// Either a single `angle` (full-circle sweep ending at that angle) or
/// a `startAngle` + `endAngle` pair (partial sweep). Both in degrees.
export type AngularGradientProps = AngularGradientBaseProps &
  ({ angle: number } | { startAngle: number; endAngle: number });

export const AngularGradient =
  createNativeView<AngularGradientProps>('AngularGradient');
