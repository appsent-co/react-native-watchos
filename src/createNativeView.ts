import { createElement, type FC } from 'react';

import type { CommonProps } from './types';
import { useModifiers } from './useModifiers';

/// Build a React component that, when rendered, asks the reconciler to
/// create a native node with the given SwiftUI view name. Component
/// files in `src/components/` are typically one line:
///   `export const VStack = createNativeView<VStackProps>('VStack');`
///
/// The `name` is forwarded as-is to the C++ shadow tree and used by
/// the Swift-side `RNWViewRegistry` to pick the renderer. `useModifiers`
/// rewrites the `modifiers` prop so callback / content modifiers work
/// (function → handler id, element → hoisted `__ModifierContent` child).
export function createNativeView<P extends object>(
  name: string
): FC<P & CommonProps> {
  const Component: FC<P & CommonProps> = (props) => {
    const { modifiers, children } = useModifiers(props.modifiers, props.children);
    return createElement(name, {
      ...props,
      modifiers,
      children,
    } as Record<string, unknown>);
  };
  Component.displayName = name;
  return Component;
}
