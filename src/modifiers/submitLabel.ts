import { createModifier } from './createModifier';

/// SwiftUI `SubmitLabel` values — the keyboard's return-key label.
export type SubmitLabelKind =
  | 'done'
  | 'go'
  | 'send'
  | 'join'
  | 'route'
  | 'search'
  | 'return'
  | 'next'
  | 'continue';

export interface SubmitLabelParams {
  label: SubmitLabelKind;
}

/// SwiftUI `.submitLabel(_:)`. Sets the semantic label shown on the keyboard's
/// submit key. Pass a label string directly or an object.
export function submitLabel(
  label: SubmitLabelKind
): ReturnType<typeof createModifier>;
export function submitLabel(
  params: SubmitLabelParams
): ReturnType<typeof createModifier>;
export function submitLabel(arg: SubmitLabelKind | SubmitLabelParams) {
  if (typeof arg === 'string') {
    return createModifier('submitLabel', { label: arg });
  }
  return createModifier('submitLabel', arg);
}
