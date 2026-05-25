import { createModifier } from './createModifier';

/// SwiftUI `TextInputAutocapitalization` values.
export type TextInputAutocapitalizationKind =
  | 'never'
  | 'words'
  | 'sentences'
  | 'characters';

export interface TextInputAutocapitalizationParams {
  value: TextInputAutocapitalizationKind;
}

/// SwiftUI `.textInputAutocapitalization(_:)` (watchOS 9+). Controls how text
/// entry auto-capitalizes. Pass a value string directly or an object. No-ops
/// on watchOS versions earlier than 9.
export function textInputAutocapitalization(
  value: TextInputAutocapitalizationKind
): ReturnType<typeof createModifier>;
export function textInputAutocapitalization(
  params: TextInputAutocapitalizationParams
): ReturnType<typeof createModifier>;
export function textInputAutocapitalization(
  arg: TextInputAutocapitalizationKind | TextInputAutocapitalizationParams
) {
  if (typeof arg === 'string') {
    return createModifier('textInputAutocapitalization', { value: arg });
  }
  return createModifier('textInputAutocapitalization', arg);
}
