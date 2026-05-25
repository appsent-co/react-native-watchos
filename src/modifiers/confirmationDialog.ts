import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

/// Controls whether the dialog's title is shown above the actions.
export type TitleVisibility = 'automatic' | 'visible' | 'hidden';

export interface ConfirmationDialogParams {
  /// The dialog's title text.
  title: string;
  /// Whether the dialog is shown. JS owns the source of truth; the native
  /// side mirrors it in local `@State` and converges on the JS value.
  isPresented: boolean;
  /// Fired with the new boolean whenever the presentation state changes.
  onChange?: (isPresented: boolean) => void;
  /// The dialog's action buttons (typically `<Button>`s).
  actions: ReactNode;
  /// Optional descriptive message shown above the actions.
  message?: ReactNode;
  /// Whether to show the title. Defaults to `'automatic'`.
  titleVisibility?: TitleVisibility;
}

/// SwiftUI `.confirmationDialog(_:isPresented:titleVisibility:actions:message:)`.
/// Presents an action-sheet-style dialog titled `title` when `isPresented`
/// is true. The boolean is bound two-way so a button tap / dismissal
/// reports back to JS via `onChange`.
export function confirmationDialog(params: ConfirmationDialogParams) {
  const { title, isPresented, onChange, actions, message, titleVisibility } =
    params;
  return createModifier('confirmationDialog', {
    title,
    isPresented,
    handler: onChange,
    actions,
    message,
    titleVisibility,
  });
}
