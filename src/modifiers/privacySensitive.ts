import { createModifier } from './createModifier';

/// SwiftUI `.privacySensitive(_:)`. Marks the subtree as containing private,
/// user-sensitive content so the system can redact it when appropriate
/// (e.g. on an inactive/wrist-down watch face). Defaults to `true`.
export function privacySensitive(value: boolean = true) {
  return createModifier('privacySensitive', { value });
}
