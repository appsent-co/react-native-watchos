import { createModifier } from './createModifier';

export type TabViewStyle =
  | 'automatic'
  | 'page'
  | 'verticalPage'
  | 'carousel';

/// SwiftUI `.tabViewStyle(_:)`. Sets the visual style applied to `TabView`s
/// within the view. `'automatic'` defers to the platform default;
/// `'verticalPage'` and `'carousel'` are watchOS-specific styles.
export function tabViewStyle(style: TabViewStyle = 'automatic') {
  return createModifier('tabViewStyle', { style });
}
