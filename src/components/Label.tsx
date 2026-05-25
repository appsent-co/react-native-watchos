import { createNativeView } from '../createNativeView';

export interface LabelProps {
  /// Text shown next to the icon.
  title: string;
  /// SF Symbol name (e.g. `'star.fill'`, `'gearshape.fill'`). Mirrors
  /// `Image`'s `systemName` — SF Symbols are the only icon source for now.
  systemImage: string;
}

/// SwiftUI `Label`. Pairs a `title` with an SF Symbol icon — the canonical
/// "icon + text" row used in lists, toolbars, and navigation links.
export const Label = createNativeView<LabelProps>('Label');
