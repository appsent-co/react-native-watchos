import { createModifier } from './createModifier';

/// SwiftUI `.allowsTightening(_:)`. When `true`, the view is allowed to
/// compress inter-character spacing to fit text into the available space
/// before truncating. Defaults to `true`.
export function allowsTightening(value: boolean = true) {
  return createModifier('allowsTightening', { value });
}
