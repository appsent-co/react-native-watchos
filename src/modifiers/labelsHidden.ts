import { createModifier } from './createModifier';

/// SwiftUI `.labelsHidden()`. Hides the labels of controls (e.g. the title of a
/// `Toggle`, `Picker`, or `Slider`) while keeping them for accessibility.
export function labelsHidden() {
  return createModifier('labelsHidden');
}
