import { Gauge, VStack } from '@appsent-co/react-native-watchos/renderer';

/// Demo for the `Gauge` view: a fractional progress gauge plus a
/// heart-rate gauge with explicit bounds and unit suffix.
export function GaugeDemo() {
  return (
    <VStack>
      <Gauge
        value={0.6}
        minimum={0}
        maximum={1}
        label="Progress"
        currentValueLabel="60%"
      />
      <Gauge
        value={120}
        minimum={40}
        maximum={200}
        label="HR"
        currentValueLabel="120 bpm"
      />
    </VStack>
  );
}
