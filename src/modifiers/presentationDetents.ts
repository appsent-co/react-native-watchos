import { createModifier } from './createModifier';

/// A single presentation detent. Either a system preset (`'medium'` /
/// `'large'`), a fractional height of the screen (`'fraction:0.5'`), or a
/// fixed point height (`'height:200'`).
export type PresentationDetent =
  | 'medium'
  | 'large'
  | `fraction:${number}`
  | `height:${number}`;

export interface PresentationDetentsParams {
  /// The set of detents the sheet may rest at. Order is irrelevant — the
  /// native side builds a `Set<PresentationDetent>`.
  detents: PresentationDetent[];
}

/// SwiftUI `.presentationDetents(_:)`. Configures the heights a sheet can
/// settle at.
///
/// NOTE: `presentationDetents` is **not available on watchOS** (iOS /
/// macOS only). On watchOS this modifier is a documented no-op — it is
/// accepted so cross-platform JS keeps type-checking, but applies nothing.
export function presentationDetents(
  detents: PresentationDetent[]
): ReturnType<typeof createModifier>;
export function presentationDetents(
  params: PresentationDetentsParams
): ReturnType<typeof createModifier>;
export function presentationDetents(
  a: PresentationDetent[] | PresentationDetentsParams
) {
  if (Array.isArray(a)) {
    return createModifier('presentationDetents', { detents: a });
  }
  return createModifier('presentationDetents', a);
}
