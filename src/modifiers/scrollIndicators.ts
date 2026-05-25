import { createModifier } from './createModifier';

/// Visibility of scroll indicators. Maps to SwiftUI's
/// `ScrollIndicatorVisibility`.
export type ScrollIndicatorVisibility =
  | 'automatic'
  | 'visible'
  | 'hidden'
  | 'never';

export interface ScrollIndicatorsParams {
  visibility: ScrollIndicatorVisibility;
}

/// SwiftUI `.scrollIndicators(_:)`. Sets the visibility of scroll
/// indicators within scrollable containers nested in this view. watchOS 9+.
export function scrollIndicators(
  visibility: ScrollIndicatorVisibility
): ReturnType<typeof createModifier>;
export function scrollIndicators(
  params: ScrollIndicatorsParams
): ReturnType<typeof createModifier>;
export function scrollIndicators(
  a: ScrollIndicatorVisibility | ScrollIndicatorsParams
) {
  if (typeof a === 'string') {
    return createModifier('scrollIndicators', { visibility: a });
  }
  return createModifier('scrollIndicators', a);
}
