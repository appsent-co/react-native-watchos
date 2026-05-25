import { createNativeView } from '../createNativeView';

export interface ProgressViewProps {
  /// Current progress (typically 0…`total`). When omitted, renders the
  /// indeterminate spinner.
  value?: number;
  /// Upper bound of `value`. Defaults to `1` (use `value` as a fraction).
  total?: number;
  /// Progress style. Defaults to `'automatic'` (SwiftUI picks per context).
  style?: 'linear' | 'circular' | 'automatic';
  /// Accent color. Same string format as other color props: named system
  /// colors (`'red'`, `'accent'`, …) or hex (`'#ff8800'`, `'#ff8800ff'`).
  tint?: string;
}

/// SwiftUI `ProgressView`. Omit `value` for the indeterminate spinner; pass
/// `value` (0…`total`) for a determinate bar or ring. Pair with `style`
/// and/or `tint` for explicit control over appearance.
export const ProgressView = createNativeView<ProgressViewProps>('ProgressView');
