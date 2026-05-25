import { createModifier } from './createModifier';

/// Named `ListSectionSpacing` cases.
export type ListSectionSpacingName = 'compact' | 'default';

export interface ListSectionSpacingParams {
  /// Explicit spacing in points. Takes precedence over `spacing`.
  value?: number;
  /// Named spacing: `'compact'` or `'default'`.
  spacing?: ListSectionSpacingName;
}

/// SwiftUI `.listSectionSpacing(_:)` (watchOS 10+). Controls the spacing
/// between sections in a `List`. Pass a number for explicit point spacing
/// (`.custom(_:)`) or a named value. No-op on watchOS 9.
export function listSectionSpacing(
  params: ListSectionSpacingParams | number | ListSectionSpacingName
) {
  if (typeof params === 'number') {
    return createModifier('listSectionSpacing', { value: params });
  }
  if (typeof params === 'string') {
    return createModifier('listSectionSpacing', { spacing: params });
  }
  return createModifier('listSectionSpacing', params);
}
