import { createModifier } from './createModifier';

export interface FocusedParams {
  /// JS-owned source of truth for whether this view is focused. The native
  /// side mirrors this into a `@FocusState` and converges on changes.
  value: boolean;
  /// Fired with the new boolean whenever focus enters or leaves the view.
  handler?: (focused: boolean) => void;
}

/// SwiftUI `.focused(_:)` — a two-way focus binding. JS owns the focused
/// state via `value`; the native side holds a `@FocusState` mirror so focus
/// reflects immediately, fires `handler` with the new value on change, and
/// converges back to the JS-supplied `value`. Params `value`, `handler`.
export function focused(params: FocusedParams) {
  return createModifier('focused', params);
}
