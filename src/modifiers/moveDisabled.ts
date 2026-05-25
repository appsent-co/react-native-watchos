import { createModifier } from './createModifier';

/// SwiftUI `.moveDisabled(_:)`. Prevents a row in an editable `List` /
/// `ForEach` from being reordered (moved) in edit mode.
export function moveDisabled(value: boolean = true) {
  return createModifier('moveDisabled', { value });
}
