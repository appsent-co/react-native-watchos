import { createModifier } from './createModifier';

/// SwiftUI `RedactionReasons`. Only `'placeholder'` is expressible on
/// watchOS today (it's the single public reason in the framework).
export type RedactionReason = 'placeholder';

/// SwiftUI `.redacted(reason:)`. Renders the subtree as a redacted
/// placeholder (e.g. for skeleton / loading states). Defaults to
/// `'placeholder'`.
export function redacted(reason: RedactionReason = 'placeholder') {
  return createModifier('redacted', { reason });
}
