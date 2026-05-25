import { createModifier } from './createModifier';

export interface ItalicParams {
  /// Whether italic is active. Defaults to `true`.
  value?: boolean;
}

/// SwiftUI `.italic(_:)`. Applies italics to text within the view. Pass
/// `false` to explicitly turn it off.
export function italic(params?: ItalicParams | boolean) {
  if (typeof params === 'boolean') {
    return createModifier('italic', { value: params });
  }
  return createModifier('italic', params);
}
