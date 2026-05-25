import { createModifier } from './createModifier';

/// SwiftUI `.unredacted()`. Opts this view out of any redaction applied by
/// an ancestor's `.redacted(reason:)`, rendering it normally.
export function unredacted() {
  return createModifier('unredacted');
}
