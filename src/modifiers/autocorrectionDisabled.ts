import { createModifier } from './createModifier';

export interface AutocorrectionDisabledParams {
  /// Whether autocorrection is disabled. Defaults to `true`.
  value?: boolean;
}

/// SwiftUI `.autocorrectionDisabled(_:)`. Disables (or re-enables)
/// autocorrection for text entry in this view. Pass a boolean directly or an
/// object; omitting the value defaults to `true` (i.e. disabled).
export function autocorrectionDisabled(
  value?: boolean
): ReturnType<typeof createModifier>;
export function autocorrectionDisabled(
  params: AutocorrectionDisabledParams
): ReturnType<typeof createModifier>;
export function autocorrectionDisabled(
  arg?: boolean | AutocorrectionDisabledParams
) {
  if (typeof arg === 'object') {
    return createModifier('autocorrectionDisabled', {
      value: arg.value ?? true,
    });
  }
  return createModifier('autocorrectionDisabled', { value: arg ?? true });
}
