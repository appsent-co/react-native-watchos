import { createModifier } from './createModifier';

/// The haptic feedback pattern played when the trigger changes. Maps to
/// `SensoryFeedback` cases: `success` / `warning` / `error` (notification
/// feedbacks), `selection`, and `impact`.
export type SensoryFeedbackKind =
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact';

export interface SensoryFeedbackParams {
  /// Which haptic pattern to play.
  feedback: SensoryFeedbackKind;
  /// Equatable trigger. Feedback plays whenever this value changes between
  /// renders — pass a counter you bump, or the changing value itself. Strings
  /// and numbers both survive the bridge.
  trigger: string | number;
}

/// SwiftUI `.sensoryFeedback(_:trigger:)` — plays haptic feedback when
/// `trigger` changes. Requires watchOS 10; on older systems the view is
/// returned unchanged.
///
/// Implemented natively via a `ViewModifier` that holds the last-seen trigger
/// and replays the feedback on change. The trigger is coerced to a single
/// hashable key, so exact type parity across renders isn't required — only
/// that the same input maps to the same key.
export function sensoryFeedback(params: SensoryFeedbackParams) {
  return createModifier('sensoryFeedback', params);
}
