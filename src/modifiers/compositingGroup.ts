import { createModifier } from './createModifier';

/// SwiftUI `.compositingGroup()`. Composites the view's descendants as a
/// single layer before applying effects like opacity or blend modes, so
/// they apply to the group as a whole rather than each child.
export function compositingGroup() {
  return createModifier('compositingGroup');
}
