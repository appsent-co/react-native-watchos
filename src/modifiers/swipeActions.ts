import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export type SwipeEdge = 'leading' | 'trailing';

export interface SwipeActionsParams {
  /// Which edge the actions are revealed from. Defaults to `'trailing'`.
  edge?: SwipeEdge;
  /// Whether a full swipe triggers the first action. Defaults to true.
  allowsFullSwipe?: boolean;
  /// The swipe action buttons. Hoisted into a content slot by `useModifiers`.
  content: ReactNode;
}

/// SwiftUI `.swipeActions(edge:allowsFullSwipe:) { … }`. Attaches swipe
/// actions to a list row; `content` holds the action `Button`s.
///
/// ```tsx
/// <Text modifiers={[swipeActions({ content: <Button title="Delete" .../> })]} />
/// ```
export function swipeActions(content: ReactNode): ReturnType<typeof createModifier>;
export function swipeActions(
  params: SwipeActionsParams
): ReturnType<typeof createModifier>;
export function swipeActions(a: SwipeActionsParams | ReactNode) {
  if (a != null && typeof a === 'object' && 'content' in a) {
    const p = a as SwipeActionsParams;
    return createModifier('swipeActions', {
      edge: p.edge,
      allowsFullSwipe: p.allowsFullSwipe,
      content: p.content,
    });
  }
  return createModifier('swipeActions', { content: a as ReactNode });
}
