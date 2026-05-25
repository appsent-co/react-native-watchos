import { createModifier } from './createModifier';

/// SwiftUI `Text.Case` values. `null` clears any inherited case
/// transform (SwiftUI's `nil`).
export type TextCase = 'uppercase' | 'lowercase';

export interface TextCaseParams {
  value?: TextCase | null;
}

/// SwiftUI `.textCase(_:)`. Applies a case transform to text within the
/// view. Pass `'uppercase'`/`'lowercase'`, `null` to clear it, or an
/// object.
export function textCase(params?: TextCaseParams | TextCase | null) {
  if (typeof params === 'string' || params === null) {
    return createModifier('textCase', { value: params });
  }
  return createModifier('textCase', params);
}
