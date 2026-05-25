/// SwiftUI `GridItem` descriptor — used by `LazyVGrid` (as a column) and
/// `LazyHGrid` (as a row). Mirrors the three sizing variants:
///   - `flexible(minimum:maximum:)` — share the axis, clamped to a range.
///   - `fixed(value)`               — exact size.
///   - `adaptive(minimum:maximum:)` — pack as many tracks as fit, each at
///     least `minimum` wide/tall.
export interface GridItem {
  size:
    | { kind: 'flexible'; minimum?: number; maximum?: number }
    | { kind: 'fixed'; value: number }
    | { kind: 'adaptive'; minimum: number; maximum?: number };
  /// Distance between this item's track and the next. SwiftUI default
  /// when omitted.
  spacing?: number;
  /// Cross-axis alignment of cells in this track.
  alignment?:
    | 'leading'
    | 'trailing'
    | 'center'
    | 'top'
    | 'bottom'
    | 'topLeading'
    | 'topTrailing'
    | 'bottomLeading'
    | 'bottomTrailing';
}

/// Convenience constructors for the three sizing variants.
export const gridItem = {
  flexible(opts: { minimum?: number; maximum?: number } = {}): GridItem {
    return { size: { kind: 'flexible', ...opts } };
  },
  fixed(value: number): GridItem {
    return { size: { kind: 'fixed', value } };
  },
  adaptive(minimum: number, maximum?: number): GridItem {
    return { size: { kind: 'adaptive', minimum, maximum } };
  },
};
