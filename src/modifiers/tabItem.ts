import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface TabItemParams {
  /// The tab's label — typically a `Label` or `Text`/`Image` — shown in the
  /// `TabView`'s tab bar.
  content: ReactNode;
}

/// SwiftUI `.tabItem { … }` (watchOS 7+). Sets the label for a view used as a
/// page inside a `TabView`.
export function tabItem(content: ReactNode): ReturnType<typeof createModifier>;
export function tabItem(params: TabItemParams): ReturnType<typeof createModifier>;
export function tabItem(a: TabItemParams | ReactNode) {
  if (a && typeof a === 'object' && 'content' in a) {
    return createModifier('tabItem', a as TabItemParams);
  }
  return createModifier('tabItem', { content: a as ReactNode });
}
