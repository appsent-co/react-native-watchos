import { createModifier } from './createModifier';

/// SwiftUI semantic font sizes. Match `Font.largeTitle`, `.title`, etc.
export type FontStyle =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'subheadline'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption'
  | 'caption2';

/// SwiftUI `Font.Weight` values.
export type FontWeight =
  | 'ultraLight'
  | 'thin'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black';

export interface FontParams {
  /// SwiftUI semantic style (`'body'`, `'headline'`, …). Wins over `size`
  /// when both are set — matching SwiftUI's `Font.title.weight(...)` API.
  style?: FontStyle;
  /// System font size in points. Ignored when `style` is set.
  size?: number;
  weight?: FontWeight;
}

/// SwiftUI `.font(_:)`. Pass a number for a system font of that size,
/// a style string for a semantic font, or an object combining both.
export function font(params?: FontParams | FontStyle | number) {
  if (typeof params === 'number') {
    return createModifier('font', { size: params });
  }
  if (typeof params === 'string') {
    return createModifier('font', { style: params });
  }
  return createModifier('font', params);
}
