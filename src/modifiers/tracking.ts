import { createModifier } from './createModifier';

/// SwiftUI `.tracking(_:)`. Sets the tracking, in points, between each
/// character pair. Like `kerning` but it also adds the spacing after the
/// final character. Tracking takes precedence over `kerning` when both
/// are applied.
export function tracking(value: number) {
  return createModifier('tracking', { value });
}
