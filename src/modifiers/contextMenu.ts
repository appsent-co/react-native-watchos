import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export interface ContextMenuParams {
  /// The menu items, rendered as the context menu's content (typically a set
  /// of `Button`s). Hoisted into a content slot by `useModifiers`.
  content: ReactNode;
}

/// SwiftUI `.contextMenu { … }`. Attaches a long-press context menu whose
/// body is `content`.
///
/// ```tsx
/// <Text modifiers={[contextMenu({ content: <Button title="Delete" .../> })]} />
/// ```
export function contextMenu(content: ReactNode): ReturnType<typeof createModifier>;
export function contextMenu(
  params: ContextMenuParams
): ReturnType<typeof createModifier>;
export function contextMenu(a: ContextMenuParams | ReactNode) {
  if (a != null && typeof a === 'object' && 'content' in a) {
    return createModifier('contextMenu', { content: (a as ContextMenuParams).content });
  }
  return createModifier('contextMenu', { content: a as ReactNode });
}
