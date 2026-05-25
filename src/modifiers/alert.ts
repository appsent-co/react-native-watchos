import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface AlertParams {
  /// The alert's title text.
  title: string;
  /// Whether the alert is shown. JS owns the source of truth; the native
  /// side mirrors it in local `@State` and converges on the JS value.
  isPresented: boolean;
  /// Fired with the new boolean whenever the presentation state changes
  /// (e.g. an action button or the system dismisses the alert).
  onChange?: (isPresented: boolean) => void;
  /// The alert's action buttons (typically `<Button>`s).
  actions: ReactNode;
  /// Optional descriptive message shown below the title.
  message?: ReactNode;
}

/// SwiftUI `.alert(_:isPresented:actions:message:)`. Presents an alert
/// titled `title` when `isPresented` is true. `actions` supplies the
/// buttons and `message` the optional body. The boolean is bound two-way
/// so a button tap / dismissal reports back to JS via `onChange`.
export function alert(params: AlertParams) {
  const { title, isPresented, onChange, actions, message } = params;
  return createModifier('alert', {
    title,
    isPresented,
    handler: onChange,
    actions,
    message,
  });
}
