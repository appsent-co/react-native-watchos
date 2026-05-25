import { createModifier } from './createModifier';

/// SwiftUI `ListStyle` variants available on watchOS.
export type ListStyleName = 'plain' | 'automatic' | 'carousel' | 'elliptical';

/// SwiftUI `.listStyle(_:)`. Sets the visual style of a `List`. `'carousel'`
/// and `'elliptical'` are the watchOS-specific styles; `'plain'` and
/// `'automatic'` map to their cross-platform counterparts.
export function listStyle(style: ListStyleName) {
  return createModifier('listStyle', { style });
}
