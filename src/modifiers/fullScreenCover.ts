import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface FullScreenCoverParams {
  /// Whether the cover is shown. JS owns the source of truth; the native
  /// side mirrors it in local `@State` and converges on the JS value.
  isPresented: boolean;
  /// Fired with the new boolean whenever the presentation state changes.
  onChange?: (isPresented: boolean) => void;
  /// The cover's content.
  content: ReactNode;
}

/// SwiftUI `.fullScreenCover(isPresented:content:)`.
///
/// LIMITATION: `.fullScreenCover` is unavailable on watchOS, so the native
/// side falls back to `.sheet(isPresented:)`. On a watch a sheet already
/// occupies (nearly) the full screen, so the visual result is close; the
/// only difference is that the fallback sheet remains interactively
/// dismissable. The JS surface is kept distinct so callers can express
/// intent and so a future watchOS that adds the API can upgrade in place.
export function fullScreenCover(params: FullScreenCoverParams) {
  const { isPresented, onChange, content } = params;
  return createModifier('fullScreenCover', {
    isPresented,
    handler: onChange,
    content,
  });
}
