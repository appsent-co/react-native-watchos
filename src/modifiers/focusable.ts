import { createModifier } from './createModifier';

export interface FocusableParams {
  /// Whether the view can receive focus. Defaults to `true`.
  value?: boolean;
}

/// SwiftUI `.focusable(_:)`. Marks the view as able (or unable) to receive
/// focus via the Digital Crown / accessibility focus. Pass a boolean directly
/// or an object; omitting the value defaults to `true`.
export function focusable(value?: boolean): ReturnType<typeof createModifier>;
export function focusable(
  params: FocusableParams
): ReturnType<typeof createModifier>;
export function focusable(arg?: boolean | FocusableParams) {
  if (typeof arg === 'object') {
    return createModifier('focusable', { value: arg.value ?? true });
  }
  return createModifier('focusable', { value: arg ?? true });
}
