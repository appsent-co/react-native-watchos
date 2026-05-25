import { createModifier } from './createModifier';

export type FrameAlignment =
  | 'leading'
  | 'trailing'
  | 'center'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface FrameParams {
  /// Fixed width. When set, `minWidth` / `maxWidth` are ignored.
  width?: number;
  /// Fixed height. When set, `minHeight` / `maxHeight` are ignored.
  height?: number;
  minWidth?: number;
  /// Pass `Infinity` to fill the available width (SwiftUI's `.infinity`).
  maxWidth?: number;
  minHeight?: number;
  /// Pass `Infinity` to fill the available height (SwiftUI's `.infinity`).
  maxHeight?: number;
  /// Where to position the view's content within the laid-out frame.
  /// Defaults to `center`, matching SwiftUI.
  alignment?: FrameAlignment;
}

/// SwiftUI `.frame(width:height:alignment:)` / `.frame(min/maxWidth:…)`.
/// To fill the screen, pass `{ maxWidth: Infinity, maxHeight: Infinity }`.
export function frame(params: FrameParams = {}) {
  return createModifier('frame', params);
}
