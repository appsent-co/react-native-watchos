import { createModifier } from './createModifier';

/// Named shape used to clip a container's background / content shape.
export type ContainerShapeName =
  | 'rectangle'
  | 'circle'
  | 'capsule'
  | 'roundedRectangle';

export interface ContainerShapeParams {
  /// Which built-in shape to use as the container shape.
  shape: ContainerShapeName;
  /// Corner radius — only used when `shape` is `'roundedRectangle'`.
  cornerRadius?: number;
}

/// SwiftUI `.containerShape(_:)`. Sets the preferred shape for the
/// container so descendant content (e.g. `.containerBackground`,
/// `.buttonBorderShape(.containerRelative)`) can adopt it.
export function containerShape(
  params: ContainerShapeParams
): ReturnType<typeof createModifier>;
export function containerShape(
  shape: ContainerShapeName,
  cornerRadius?: number
): ReturnType<typeof createModifier>;
export function containerShape(
  a: ContainerShapeParams | ContainerShapeName,
  cornerRadius?: number
) {
  if (typeof a === 'string') {
    return createModifier('containerShape', { shape: a, cornerRadius });
  }
  return createModifier('containerShape', a);
}
