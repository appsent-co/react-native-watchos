import type { ViewModifier } from '../types';

/// Build a serializable modifier descriptor. Modifier factories in this
/// directory (`padding`, `background`, …) are one-liners that wrap this.
///
/// The `$type` discriminator is appended *after* params so a stray
/// `$type` key in params can't clobber it.
export function createModifier<P extends object>(
  $type: string,
  params?: P
): ViewModifier {
  return { ...(params ?? {}), $type } as ViewModifier;
}
