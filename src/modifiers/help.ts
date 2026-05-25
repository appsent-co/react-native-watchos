import { createModifier } from './createModifier';

export interface HelpParams {
  /// The help text. Surfaced as the view's accessibility hint; on watchOS
  /// there is no pointer hover, so the tooltip itself is effectively a
  /// no-op, but the API is available and the hint is honored by VoiceOver.
  text: string;
}

/// SwiftUI `.help(_:)`. Attaches a short description used as the
/// accessibility hint (and, on platforms with a pointer, a tooltip).
export function help(params: HelpParams): ReturnType<typeof createModifier>;
export function help(text: string): ReturnType<typeof createModifier>;
export function help(a: HelpParams | string) {
  if (typeof a === 'string') return createModifier('help', { text: a });
  return createModifier('help', a);
}
