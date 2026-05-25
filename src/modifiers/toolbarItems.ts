import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface ToolbarParams {
  /// The toolbar items. On watchOS, placement is limited — items are
  /// supplied without explicit `ToolbarItemPlacement` and the system
  /// positions them (typically in the top bar of a `<NavigationStack>`).
  content: ReactNode;
}

/// SwiftUI `.toolbar { content }`. Adds toolbar items to a view inside a
/// `<NavigationStack>`.
///
/// LIMITATION: watchOS exposes only a narrow set of toolbar placements, so
/// this binding keeps it simple — `content` is rendered as the toolbar
/// body and the system chooses placement. Per-item placement control is
/// not exposed. (This file is named `toolbarItems.ts` because the
/// `toolbar.ts` filename is owned by a separate "Toolbar polish" unit; the
/// exported factory and `$type` are still `toolbar`.)
export function toolbar(params: ToolbarParams) {
  const { content } = params;
  return createModifier('toolbar', { content });
}
