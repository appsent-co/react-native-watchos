import { createModifier } from './createModifier';

export interface BlurParams {
  /// Gaussian blur radius in points. Larger values blur more.
  radius: number;
  /// When `true`, the blur is opaque (fully obscures content behind the
  /// view's bounds); when `false` (default) the blur is transparent.
  opaque?: boolean;
}

/// SwiftUI `.blur(radius:opaque:)`. Applies a Gaussian blur to the view.
export function blur(params: BlurParams): ReturnType<typeof createModifier>;
export function blur(radius: number): ReturnType<typeof createModifier>;
export function blur(a: BlurParams | number) {
  if (typeof a === 'number') return createModifier('blur', { radius: a });
  return createModifier('blur', { opaque: false, ...a });
}
