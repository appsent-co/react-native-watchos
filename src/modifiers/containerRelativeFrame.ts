import { createModifier } from './createModifier';

/// Axes the relative frame should expand along.
export type ContainerRelativeFrameAxes = 'horizontal' | 'vertical' | 'both';

/// Where to position the view within the container-relative frame.
export type ContainerRelativeFrameAlignment =
  | 'leading'
  | 'trailing'
  | 'center'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface ContainerRelativeFrameParams {
  /// Which axes to size relative to the nearest container. Defaults to
  /// `'both'`.
  axes?: ContainerRelativeFrameAxes;
  /// Alignment of the content inside the resulting frame. Defaults to
  /// `'center'`.
  alignment?: ContainerRelativeFrameAlignment;
}

/// SwiftUI `.containerRelativeFrame(_:alignment:)`. Sizes the view relative
/// to the nearest container (scroll view, navigation root, …). Requires
/// watchOS 10+; on older systems the view is returned unchanged.
export function containerRelativeFrame(params: ContainerRelativeFrameParams = {}) {
  return createModifier('containerRelativeFrame', params);
}
