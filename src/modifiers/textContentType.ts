import { createModifier } from './createModifier';

/// Subset of `WKTextContentType` (watchOS's content-type hints) that maps
/// cleanly across platforms. watchOS does not expose the full
/// `UITextContentType` surface, so this is intentionally limited to the
/// common, broadly-available cases.
export type TextContentTypeKind =
  | 'username'
  | 'password'
  | 'newPassword'
  | 'oneTimeCode'
  | 'emailAddress'
  | 'telephoneNumber'
  | 'name'
  | 'URL';

export interface TextContentTypeParams {
  type: TextContentTypeKind;
}

/// SwiftUI `.textContentType(_:)`. On watchOS this takes a `WKTextContentType`,
/// which hints the system about the semantic meaning of the field's text
/// (autofill credentials, one-time codes, etc.). Pass a type string directly
/// or an object.
export function textContentType(
  type: TextContentTypeKind
): ReturnType<typeof createModifier>;
export function textContentType(
  params: TextContentTypeParams
): ReturnType<typeof createModifier>;
export function textContentType(arg: TextContentTypeKind | TextContentTypeParams) {
  if (typeof arg === 'string') {
    return createModifier('textContentType', { type: arg });
  }
  return createModifier('textContentType', arg);
}
