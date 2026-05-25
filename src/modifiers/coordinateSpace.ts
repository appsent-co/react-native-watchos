import { createModifier } from './createModifier';

export interface CoordinateSpaceParams {
  /// Name identifying this coordinate space. A descendant `GeometryReader`
  /// (or other geometry reader) can resolve coordinates relative to it by
  /// the same name.
  name: string;
}

/// SwiftUI `.coordinateSpace(.named(_:))`. Tags the view with a named
/// coordinate space so descendants can express geometry relative to it.
///
/// ```tsx
/// <VStack modifiers={[coordinateSpace('scroll')]}>…</VStack>
/// ```
export function coordinateSpace(params: CoordinateSpaceParams): ReturnType<typeof createModifier>;
export function coordinateSpace(name: string): ReturnType<typeof createModifier>;
export function coordinateSpace(a: CoordinateSpaceParams | string) {
  if (typeof a === 'string') return createModifier('coordinateSpace', { name: a });
  return createModifier('coordinateSpace', a);
}
