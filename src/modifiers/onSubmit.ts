import { createModifier } from './createModifier';

export type SubmitTrigger = 'text' | 'search';

export interface OnSubmitParams {
  /// Which submit source(s) trigger the handler. Defaults to `'text'`.
  triggers?: SubmitTrigger;
  /// Fired when the matching submit action occurs.
  handler: () => void;
}

/// SwiftUI `.onSubmit(of:_:)`. Fires `handler` when the user submits via the
/// matching trigger (e.g. the keyboard return key for `'text'`).
///
/// ```tsx
/// <TextField modifiers={[onSubmit(() => save())]} />
/// ```
export function onSubmit(handler: () => void): ReturnType<typeof createModifier>;
export function onSubmit(
  params: OnSubmitParams
): ReturnType<typeof createModifier>;
export function onSubmit(a: OnSubmitParams | (() => void)) {
  if (typeof a === 'function') return createModifier('onSubmit', { handler: a });
  return createModifier('onSubmit', { triggers: a.triggers, handler: a.handler });
}
