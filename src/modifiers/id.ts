import { createModifier } from './createModifier';

/// SwiftUI `.id(_:)`. Binds a stable identity to the view; changing the
/// value resets the view's lifetime (state, animations). Accepts a string
/// or number, used as the Hashable identifier.
export function id(value: string | number) {
  return createModifier('id', { value });
}
