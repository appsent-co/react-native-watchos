import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface TextProps extends CommonProps {
  children?: string | number | (string | number)[];
}

/// SwiftUI `Text`. Children must be strings (or numbers, coerced) — the
/// native side concatenates rawText children into a single styled `Text`.
/// Style via the `modifiers` prop (`foregroundColor`, `font`, …).
export function Text(props: TextProps) {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('Text', { ...props, modifiers, children });
}
