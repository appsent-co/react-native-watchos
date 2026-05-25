import { createModifier } from './createModifier';

export interface DisabledParams {
  /// Whether the view is disabled. Defaults to `true` so `disabled()`
  /// reads naturally as "disable this view".
  value?: boolean;
}

/// SwiftUI `.disabled(_:)`. Blocks user interaction with the view and its
/// descendants when `value` is true.
///
/// ```tsx
/// <Button modifiers={[disabled(isBusy)]} />
/// ```
export function disabled(value?: boolean): ReturnType<typeof createModifier>;
export function disabled(params: DisabledParams): ReturnType<typeof createModifier>;
export function disabled(a: boolean | DisabledParams = true) {
  if (typeof a === 'boolean') return createModifier('disabled', { value: a });
  return createModifier('disabled', { value: a.value ?? true });
}
