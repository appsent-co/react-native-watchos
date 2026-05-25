import { createModifier } from './createModifier';

export type TransitionType =
  | 'opacity'
  | 'slide'
  | 'scale'
  | 'identity'
  | 'move';

export type TransitionEdge = 'top' | 'bottom' | 'leading' | 'trailing';

export interface TransitionParams {
  /// The transition preset. Defaults to `'opacity'`.
  type?: TransitionType;
  /// Edge to move from/to. Only honored when `type` is `'move'`
  /// (defaults to `'bottom'`).
  edge?: TransitionEdge;
}

/// SwiftUI `.transition(_:)`. Describes how the view animates in/out when it
/// is inserted into or removed from the view tree (pair with `animation`).
///
/// ```tsx
/// <Text modifiers={[transition({ type: 'move', edge: 'leading' })]} />
/// ```
export function transition(
  type?: TransitionType
): ReturnType<typeof createModifier>;
export function transition(
  params: TransitionParams
): ReturnType<typeof createModifier>;
export function transition(a: TransitionType | TransitionParams = 'opacity') {
  if (typeof a === 'string') return createModifier('transition', { type: a });
  return createModifier('transition', a);
}
