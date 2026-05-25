import { ProgressView } from '@appsent-co/react-native-watchos/renderer';

interface ProgressIndicatorProps {
  /// 0…1.
  value: number;
}

/// Linear progress bar with red→orange→green tint based on `value`. Port
/// of tmp/WatchApp/Views/ProgressIndicatorView.swift — animation is
/// driven from JS (see `useRamp` in TasksScreen / ScheduleScreen) so we
/// don't rely on SwiftUI's implicit `.animation(_:value:)`, which is
/// unreliable through the AnyView mount/unmount around our toggle.
export function ProgressIndicator({ value }: ProgressIndicatorProps) {
  const pct = Math.round(value * 100);
  const tint = pct <= 20 ? 'red' : pct <= 50 ? 'orange' : 'green';
  return <ProgressView value={value} style="linear" tint={tint} />;
}
