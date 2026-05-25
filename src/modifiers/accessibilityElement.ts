import { createModifier } from './createModifier';

/// How a SwiftUI accessibility element treats its children.
/// - `'ignore'` — children are not accessible (the element is a leaf)
/// - `'combine'` — children are merged into this element
/// - `'contain'` — children remain individually accessible inside it
export type AccessibilityChildBehavior = 'ignore' | 'combine' | 'contain';

/// SwiftUI `.accessibilityElement(children:)`. Creates an accessibility
/// element for the view, controlling how its children participate.
/// Defaults to `'ignore'`, matching SwiftUI.
export function accessibilityElement(
  children: AccessibilityChildBehavior = 'ignore'
) {
  return createModifier('accessibilityElement', { children });
}
