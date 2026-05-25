import { createElement, type FC } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface ColorProps {
  /// Named SwiftUI color (`'red'`, `'primary'`, …) or hex string
  /// (`'#ff0044'` / `'#ff0044aa'`). Takes precedence over RGB props.
  name?: string;
  /// sRGB red component, 0..1. Used when `name` is unset.
  red?: number;
  /// sRGB green component, 0..1. Used when `name` is unset.
  green?: number;
  /// sRGB blue component, 0..1. Used when `name` is unset.
  blue?: number;
  /// Multiplies the resolved color's alpha. Defaults to 1.
  opacity?: number;
}

const ColorFn: FC<ColorProps & CommonProps> = (props) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('Color', { ...props, modifiers, children });
};
ColorFn.displayName = 'Color';

const named = (name: string): FC<CommonProps> => {
  const C: FC<CommonProps> = (props) =>
    createElement('Color', { ...props, name });
  C.displayName = `Color.${name}`;
  return C;
};

/// SwiftUI `Color` as a `View` — fills its frame with the resolved color.
/// Use the namespaced helpers (`Color.red`, `Color.primary`, …) for
/// stock colors, or pass `name` / `red`+`green`+`blue` to the bare
/// component for custom values.
export const Color = Object.assign(ColorFn, {
  red: named('red'),
  blue: named('blue'),
  green: named('green'),
  yellow: named('yellow'),
  orange: named('orange'),
  purple: named('purple'),
  pink: named('pink'),
  white: named('white'),
  black: named('black'),
  gray: named('gray'),
  brown: named('brown'),
  mint: named('mint'),
  cyan: named('cyan'),
  indigo: named('indigo'),
  teal: named('teal'),
  primary: named('primary'),
  secondary: named('secondary'),
  accent: named('accent'),
  clear: named('clear'),
});
