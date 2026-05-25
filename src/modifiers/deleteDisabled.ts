import { createModifier } from './createModifier';

/// SwiftUI `.deleteDisabled(_:)`. Prevents a row in an editable `List` /
/// `ForEach` from being deleted via swipe-to-delete or edit mode.
export function deleteDisabled(value: boolean = true) {
  return createModifier('deleteDisabled', { value });
}
