import { createElement, type FC, type ReactNode } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface AsyncImageProps {
  /// Absolute URL of the image to load. Invalid URLs render nothing.
  url: string;
  /// Pixel scale of the image (defaults to `1`). Use `2` / `3` if the
  /// remote asset is intended for @2x / @3x displays.
  scale?: number;
}

interface PhaseSlotProps extends CommonProps {
  children?: ReactNode;
}

/// Sentinel child of `<AsyncImage>` — contents render during the
/// `.empty` phase (request in flight, no image yet). Maps to the
/// equivalent branch of SwiftUI's `AsyncImagePhase`.
const Empty: FC<PhaseSlotProps> = (props) =>
  createElement('AsyncImagePhaseEmpty', props);
Empty.displayName = 'AsyncImage.Empty';

/// Sentinel child of `<AsyncImage>` — contents render during the
/// `.success(image)` phase. Place an `<AsyncImage.Image />` inside to
/// position the loaded image; surrounding views (text, overlays) render
/// alongside it.
const Success: FC<PhaseSlotProps> = (props) =>
  createElement('AsyncImagePhaseSuccess', props);
Success.displayName = 'AsyncImage.Success';

/// Sentinel child of `<AsyncImage>` — contents render during the
/// `.failure(error)` phase. The error itself is not exposed to JS in v1;
/// use this slot for a static fallback (icon, retry hint, …).
const Failure: FC<PhaseSlotProps> = (props) =>
  createElement('AsyncImagePhaseFailure', props);
Failure.displayName = 'AsyncImage.Failure';

/// Placeholder for the loaded SwiftUI `Image` value, valid only inside
/// `<AsyncImage.Success>`. Image-only modifiers (`resizable()`,
/// `aspectRatio({ contentMode })`, …) apply here so they preserve the
/// `Image → Image` chain, the way SwiftUI's `{ image in image.resizable() }`
/// closure does. Generic modifiers (`frame`, `padding`, …) should usually
/// go on the parent `<AsyncImage>` so they also size the empty/failure
/// states.
const LoadedImage: FC<CommonProps> = (props) =>
  createElement('AsyncImageImage', props);
LoadedImage.displayName = 'AsyncImage.Image';

const AsyncImageFn: FC<AsyncImageProps & CommonProps & { children?: ReactNode }> = (
  props
) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('AsyncImage', { ...props, modifiers, children });
};
AsyncImageFn.displayName = 'AsyncImage';

/// SwiftUI `AsyncImage`. With no children, behaves like the bare
/// `AsyncImage(url:scale:)` initializer (intrinsic size, system spinner
/// + broken-image glyph). Provide `<AsyncImage.Empty>`,
/// `<AsyncImage.Success>` and/or `<AsyncImage.Failure>` slots to take
/// the per-phase closure form. Inside `Success`, mark where the loaded
/// image goes with `<AsyncImage.Image />`.
///
/// ```tsx
/// <AsyncImage url={url} modifiers={[frame({ width: 40, height: 40 })]}>
///   <AsyncImage.Empty><ProgressView /></AsyncImage.Empty>
///   <AsyncImage.Success>
///     <AsyncImage.Image
///       modifiers={[resizable(), aspectRatio({ contentMode: 'fit' })]}
///     />
///   </AsyncImage.Success>
///   <AsyncImage.Failure><Image systemName="photo" /></AsyncImage.Failure>
/// </AsyncImage>
/// ```
export const AsyncImage = Object.assign(AsyncImageFn, {
  Empty,
  Success,
  Failure,
  Image: LoadedImage,
});
