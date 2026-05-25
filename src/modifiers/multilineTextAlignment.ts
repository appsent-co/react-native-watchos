import { createModifier } from './createModifier';

/// SwiftUI `TextAlignment` values.
export type TextAlignment = 'leading' | 'center' | 'trailing';

export interface MultilineTextAlignmentParams {
  value?: TextAlignment;
}

/// SwiftUI `.multilineTextAlignment(_:)`. Sets how multi-line text within
/// the view is aligned. Pass an alignment string directly or an object.
export function multilineTextAlignment(
  params?: MultilineTextAlignmentParams | TextAlignment
) {
  if (typeof params === 'string') {
    return createModifier('multilineTextAlignment', { value: params });
  }
  return createModifier('multilineTextAlignment', params);
}
