import { createModifier } from './createModifier';

export interface ListRowInsetsParams {
  top?: number;
  leading?: number;
  bottom?: number;
  trailing?: number;
}

/// SwiftUI `.listRowInsets(_:)`. Applies `EdgeInsets` to a row inside a
/// `List`, overriding the default per-row padding. Omitted edges default
/// to 0.
export function listRowInsets(params: ListRowInsetsParams) {
  return createModifier('listRowInsets', params);
}
