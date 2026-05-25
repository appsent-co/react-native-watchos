import { createModifier } from './createModifier';

export interface StrikethroughParams {
  /// Whether the strikethrough is active. Defaults to `true`.
  value?: boolean;
  /// Strikethrough color. Accepts a named color or hex (`'#RRGGBB'` /
  /// `'#RRGGBBAA'`). Omit to use the text's foreground color.
  color?: string;
}

/// SwiftUI `.strikethrough(_:color:)`. Applies a strikethrough to text
/// within the view. Pass a boolean to toggle it, or an object to also set
/// a color.
export function strikethrough(params?: StrikethroughParams | boolean) {
  if (typeof params === 'boolean') {
    return createModifier('strikethrough', { value: params });
  }
  return createModifier('strikethrough', params);
}
