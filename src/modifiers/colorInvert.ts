import { createModifier } from './createModifier';

/// SwiftUI `.colorInvert()`. Inverts every color in the view.
export function colorInvert() {
  return createModifier('colorInvert');
}
