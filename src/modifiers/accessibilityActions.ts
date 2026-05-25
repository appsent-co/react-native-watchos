import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface AccessibilityActionsParams {
  /// A view (typically `Button`s) declaring the actions available to
  /// assistive technologies for this element.
  content: ReactNode;
}

/// SwiftUI `.accessibilityActions(_:)` (watchOS 10+). Declares a set of
/// custom accessibility actions from the provided content. On watchOS 9 the
/// modifier is a no-op and the view is returned unchanged.
export function accessibilityActions(params: AccessibilityActionsParams) {
  return createModifier('accessibilityActions', params);
}
