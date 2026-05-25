import { createModifier } from './createModifier';

export type AlignmentGuideName =
  | 'leading'
  | 'trailing'
  | 'top'
  | 'bottom'
  | 'centerHorizontal'
  | 'centerVertical'
  | 'firstTextBaseline'
  | 'lastTextBaseline';

export interface AlignmentGuideParams {
  /// Which alignment guide to override. Horizontal guides
  /// (`leading`/`trailing`/`centerHorizontal`) pair with a parent's
  /// horizontal alignment; vertical guides (`top`/`bottom`/baselines/
  /// `centerVertical`) pair with a vertical one.
  guide: AlignmentGuideName;
  /// Offset added to the guide's default position, in points. The native
  /// side computes `defaultGuideValue + offset`.
  offset?: number;
}

/// SwiftUI `.alignmentGuide(_:computeValue:)`.
///
/// LIMITED: SwiftUI's real `computeValue` is an arbitrary closure over the
/// view's `ViewDimensions`. A closure cannot cross the JS bridge, so this
/// exposes a simplified form — pick a named `guide` and a numeric `offset`,
/// and the native side returns the guide's default value plus that offset.
/// Custom alignment guides and dimension-relative math are not expressible.
export function alignmentGuide(params: AlignmentGuideParams) {
  return createModifier('alignmentGuide', params);
}
