import { createModifier } from './createModifier';

export type GaugeStyle =
  | 'automatic'
  | 'accessoryCircular'
  | 'accessoryCircularCapacity'
  | 'accessoryLinear'
  | 'accessoryLinearCapacity'
  | 'linearCapacity';

/// SwiftUI `.gaugeStyle(_:)`. Sets the visual style applied to `Gauge`s
/// within the view. `'automatic'` defers to the platform default. Some
/// capacity styles require newer watchOS; unsupported values leave the
/// view unchanged on older systems.
export function gaugeStyle(style: GaugeStyle = 'automatic') {
  return createModifier('gaugeStyle', { style });
}
