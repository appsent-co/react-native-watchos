import { createModifier } from './createModifier';

export interface HiddenParams {
  /// When `false`, the view is left visible (the modifier is a no-op).
  /// Defaults to `true`. Lets you toggle visibility from a JS condition
  /// while keeping the view's layout footprint.
  value?: boolean;
}

/// SwiftUI `.hidden()`. Hides the view while preserving the space it
/// occupies in layout. Pass `{ value: false }` (or `false`) to keep it
/// visible.
export function hidden(
  params?: HiddenParams
): ReturnType<typeof createModifier>;
export function hidden(value: boolean): ReturnType<typeof createModifier>;
export function hidden(a?: HiddenParams | boolean) {
  if (typeof a === 'boolean') {
    return createModifier('hidden', { value: a });
  }
  return createModifier('hidden', a);
}
