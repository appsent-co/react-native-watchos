import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export interface ListRowBackgroundParams {
  /// The view rendered behind the row's content.
  content: ReactNode;
}

/// SwiftUI `.listRowBackground(_:)`. Places a custom view behind a row in a
/// `List`. The `content` element is hoisted across the bridge by
/// `useModifiers` and rendered as the row background.
export function listRowBackground(params: ListRowBackgroundParams) {
  return createModifier('listRowBackground', params);
}
