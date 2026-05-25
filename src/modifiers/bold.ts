import { createModifier } from './createModifier';

export interface BoldParams {
  /// Whether bold is active. Defaults to `true`.
  value?: boolean;
}

/// SwiftUI `.bold(_:)`. Applies a bold font weight to text within the
/// view. Pass `false` to explicitly turn it off.
export function bold(params?: BoldParams | boolean) {
  if (typeof params === 'boolean') {
    return createModifier('bold', { value: params });
  }
  return createModifier('bold', params);
}
