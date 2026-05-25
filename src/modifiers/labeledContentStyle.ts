import { createModifier } from './createModifier';

export type LabeledContentStyle = 'automatic';

/// SwiftUI `.labeledContentStyle(_:)`. Sets the visual style applied to
/// `LabeledContent` within the view (watchOS 9+). `'automatic'` defers to
/// the platform default.
export function labeledContentStyle(style: LabeledContentStyle = 'automatic') {
  return createModifier('labeledContentStyle', { style });
}
