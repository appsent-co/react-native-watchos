import { createNativeView } from '../createNativeView';

export interface ListProps {
  /// watchOS list style. Defaults to `'automatic'` (SwiftUI picks per
  /// context, typically `carousel` on watchOS). Use `'plain'` when rows
  /// need exact heights — `carousel` scales rows as they scroll, which
  /// fights `frame({ height })` on individual rows.
  style?: 'plain' | 'carousel' | 'elliptical' | 'automatic';
}

/// SwiftUI `List`. Children render as rows. Group rows by wrapping a
/// subset in `<Section>` (optionally with `<Section.Header>` /
/// `<Section.Footer>` for header and footer content).
export const List = createNativeView<ListProps>('List');
