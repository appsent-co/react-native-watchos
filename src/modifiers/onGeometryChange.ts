import { createModifier } from './createModifier';

/// Size payload delivered to `onGeometryChange`'s handler.
export interface GeometrySize {
  width: number;
  height: number;
}

/// SwiftUI `.onGeometryChange(for:of:action:)` (watchOS 11+ / iOS 16+),
/// observing the view's `size`. The handler fires with the current size
/// whenever it changes.
///
/// ```tsx
/// <Rectangle modifiers={[onGeometryChange((s) => setSize(s))]} />
/// ```
///
/// On watchOS < 11 this is a no-op (view passes through, handler never
/// fires) — guarded natively.
export function onGeometryChange(handler: (size: GeometrySize) => void) {
  return createModifier('onGeometryChange', { handler });
}
