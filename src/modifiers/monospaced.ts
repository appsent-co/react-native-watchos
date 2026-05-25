import { createModifier } from './createModifier';

export interface MonospacedParams {
  /// Whether the monospaced font is active. Defaults to `true`.
  value?: boolean;
}

/// SwiftUI `.monospaced(_:)`. Renders text within the view with a fixed-
/// width (monospaced) font. Pass `false` to explicitly turn it off.
export function monospaced(params?: MonospacedParams | boolean) {
  if (typeof params === 'boolean') {
    return createModifier('monospaced', { value: params });
  }
  return createModifier('monospaced', params);
}
