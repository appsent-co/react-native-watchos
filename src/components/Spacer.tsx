import { createNativeView } from '../createNativeView';

export interface SpacerProps {
  /// Optional minimum length the spacer will take, in points.
  minLength?: number;
}

export const Spacer = createNativeView<SpacerProps>('Spacer');
