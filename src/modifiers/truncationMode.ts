import { createModifier } from './createModifier';

/// SwiftUI `Text.TruncationMode` values — where the ellipsis appears when
/// text is truncated.
export type TruncationMode = 'head' | 'middle' | 'tail';

export interface TruncationModeParams {
  mode?: TruncationMode;
}

/// SwiftUI `.truncationMode(_:)`. Controls where text within the view is
/// truncated when it doesn't fit. Pass a mode string directly or an object.
export function truncationMode(params?: TruncationModeParams | TruncationMode) {
  if (typeof params === 'string') {
    return createModifier('truncationMode', { mode: params });
  }
  return createModifier('truncationMode', params);
}
