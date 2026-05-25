import { createModifier } from './createModifier';

export interface LineLimitParams {
  /// Maximum number of lines text may occupy before truncating.
  value?: number;
}

/// SwiftUI `.lineLimit(_:)`. Caps the number of lines text within the
/// view can use. Pass a number directly or an object.
export function lineLimit(params?: LineLimitParams | number) {
  if (typeof params === 'number') {
    return createModifier('lineLimit', { value: params });
  }
  return createModifier('lineLimit', params);
}
