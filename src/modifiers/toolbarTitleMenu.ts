import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface ToolbarTitleMenuParams {
  /// The menu's content — typically `Button`s — shown when the user taps the
  /// navigation title.
  content: ReactNode;
}

/// SwiftUI `.toolbarTitleMenu { … }` (watchOS 9+). Populates the menu that
/// appears from the navigation title.
export function toolbarTitleMenu(content: ReactNode): ReturnType<typeof createModifier>;
export function toolbarTitleMenu(
  params: ToolbarTitleMenuParams
): ReturnType<typeof createModifier>;
export function toolbarTitleMenu(a: ToolbarTitleMenuParams | ReactNode) {
  if (a && typeof a === 'object' && 'content' in a) {
    return createModifier('toolbarTitleMenu', a as ToolbarTitleMenuParams);
  }
  return createModifier('toolbarTitleMenu', { content: a as ReactNode });
}
