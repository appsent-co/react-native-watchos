import { createModifier } from './createModifier';

/// SwiftUI `.tag(_:)`. Tags the view with a value used by selection-driven
/// containers like `Picker` and `TabView` to match the bound selection.
export function tag(value: string) {
  return createModifier('tag', { value });
}
