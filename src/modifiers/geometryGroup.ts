import { createModifier } from './createModifier';

/// SwiftUI `.geometryGroup()`. Isolates the view's geometry from its
/// parent so child layout/transform changes animate as one unit. Native
/// support requires watchOS 10+; on older systems it is a no-op.
export function geometryGroup() {
  return createModifier('geometryGroup');
}
