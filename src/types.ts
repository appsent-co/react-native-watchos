import type { ReactNode } from 'react';

/// A single SwiftUI modifier descriptor. Built by factories in
/// `src/modifiers/` (`padding({all: 10})`, `background('red')`, …).
/// The shape is just JSON: a `$type` discriminator plus modifier-specific
/// params. The native side dispatches on `$type`.
export interface ViewModifier {
  readonly $type: string;
  readonly [key: string]: unknown;
}

/// Common props every SwiftUI view accepts. Specific components extend
/// this with their own typed props.
export interface CommonProps {
  /// Modifiers applied left-to-right in array order. Order matters — SwiftUI
  /// modifiers are non-commutative (`padding().background()` paints the
  /// background outside the padded region; `background().padding()` paints
  /// it inside).
  modifiers?: ViewModifier[];
  /// Identifier consumed by a `<TabView>` parent: matches against its
  /// `selection` prop. Inert when the parent isn't a `TabView`.
  tabTag?: string;
  children?: ReactNode;
}
