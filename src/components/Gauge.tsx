import { createNativeView } from '../createNativeView';

export interface GaugeProps {
  /// Current value. Values outside `minimum`...`maximum` are clamped by
  /// SwiftUI.
  value: number;
  /// Lower bound of `value`. Defaults to 0.
  minimum?: number;
  /// Upper bound of `value`. Defaults to 1.
  maximum?: number;
  /// Caption rendered alongside the gauge.
  label?: string;
  /// Secondary caption for the current value (e.g. `"60%"`, `"120 bpm"`).
  currentValueLabel?: string;
}

/// SwiftUI `Gauge` (watchOS 7+). Stateless display of a `value` within a
/// numeric range. `label` and `currentValueLabel` are flat string props
/// rather than children — watchOS gauges treat them as captions, not
/// arbitrary content trees.
export const Gauge = createNativeView<GaugeProps>('Gauge');
