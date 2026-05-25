import { createModifier } from './createModifier';

/// Visibility of control labels.
export type LabelsVisibilityValue = 'automatic' | 'visible' | 'hidden';

/// SwiftUI `.labelsVisibility(_:)`. The visibility-driven successor to
/// `labelsHidden()` — lets you explicitly show, hide, or defer control labels.
///
/// LIMITATION: `.labelsVisibility(_:)` only exists on watchOS 11+ SDKs, newer
/// than this package's build floor. To keep the native side compiling on every
/// supported SDK it is currently a documented no-op — the view is returned
/// unchanged. Prefer `labelsHidden()` for hiding labels today.
export function labelsVisibility(
  visibility: LabelsVisibilityValue = 'automatic'
) {
  return createModifier('labelsVisibility', { visibility });
}
