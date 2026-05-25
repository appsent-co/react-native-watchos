import { createModifier } from './createModifier';

/// SwiftUI `.navigationBarBackButtonHidden(_:)`. Hides the automatic back
/// button on a view pushed inside a `<NavigationStack>`. Defaults to
/// hiding it (`value: true`); pass `false` to restore the default button.
export function navigationBarBackButtonHidden(value: boolean = true) {
  return createModifier('navigationBarBackButtonHidden', { value });
}
