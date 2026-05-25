import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface NavigationDestinationParams {
  /// Whether the destination is currently pushed onto the stack. JS owns
  /// this; the native side mirrors it so the push animates instantly.
  isPresented: boolean;
  /// Fired with the new boolean when the presentation state changes
  /// (e.g. the user pops via the back button).
  onChange?: (isPresented: boolean) => void;
  /// The destination screen to push.
  content: ReactNode;
}

/// SwiftUI `.navigationDestination(isPresented:destination:)`. Pushes
/// `content` onto the enclosing `<NavigationStack>` when `isPresented`
/// is true. The boolean is bound two-way so a back-button pop reports
/// back to JS via `onChange`.
export function navigationDestination(params: NavigationDestinationParams) {
  const { isPresented, onChange, content } = params;
  return createModifier('navigationDestination', {
    isPresented,
    handler: onChange,
    content,
  });
}
