import { createModifier } from './createModifier';

/// Whether a material/glass surface renders in its active or inactive
/// appearance. `automatic` lets the system decide based on context.
export type MaterialActiveAppearanceMode = 'automatic' | 'active' | 'inactive';

export interface MaterialActiveAppearanceParams {
  /// The appearance mode. Defaults to `automatic`.
  appearance?: MaterialActiveAppearanceMode;
}

/// SwiftUI `.materialActiveAppearance(_:)` (watchOS 26 "Liquid Glass").
/// Forces a material to render as active or inactive regardless of whether
/// its window/scene is key. No-op on watchOS < 26.
export function materialActiveAppearance(
  appearance: MaterialActiveAppearanceMode = 'automatic'
) {
  return createModifier('materialActiveAppearance', { appearance });
}
