import { createModifier } from './createModifier';

export interface UnderlineParams {
  /// Whether the underline is active. Defaults to `true`.
  value?: boolean;
  /// Underline color. Accepts a named color or hex (`'#RRGGBB'` /
  /// `'#RRGGBBAA'`). Omit to use the text's foreground color.
  color?: string;
}

/// SwiftUI `.underline(_:color:)`. Applies an underline to text within the
/// view. Pass a boolean to toggle it, or an object to also set a color.
export function underline(params?: UnderlineParams | boolean) {
  if (typeof params === 'boolean') {
    return createModifier('underline', { value: params });
  }
  return createModifier('underline', params);
}
