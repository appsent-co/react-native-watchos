import { createModifier } from './createModifier';

/// SwiftUI `.selectionDisabled(_:)` (watchOS 10+). Prevents the affected
/// view (e.g. a `List` row) from being selected. No-op on watchOS 9.
export function selectionDisabled(value: boolean = true) {
  return createModifier('selectionDisabled', { value });
}
