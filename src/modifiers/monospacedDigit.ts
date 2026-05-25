import { createModifier } from './createModifier';

/// SwiftUI `.monospacedDigit()`. Keeps the default font but renders digits
/// with uniform (monospaced) width, so numbers don't shift horizontally as
/// they change — ideal for counters and timers. Takes no parameters.
export function monospacedDigit() {
  return createModifier('monospacedDigit');
}
