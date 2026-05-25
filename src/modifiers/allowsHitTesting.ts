import { createModifier } from './createModifier';

/// SwiftUI `.allowsHitTesting(_:)`. When `false`, the view is invisible to
/// taps and gestures, which pass through to whatever is behind it. Pass
/// `true` (the default) to restore normal hit testing.
export function allowsHitTesting(value: boolean) {
  return createModifier('allowsHitTesting', { value });
}
