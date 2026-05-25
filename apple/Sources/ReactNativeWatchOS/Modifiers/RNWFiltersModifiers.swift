import SwiftUI

/// Aggregator for the "Filters & effects" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
///
/// `visualEffect` is intentionally omitted: its closure-based API
/// (`{ content, proxy in … }`) has no static JSON form the bridge can
/// express.
enum RNWFiltersModifiers {
    @MainActor
    static func registerAll() {
        RNWBlurModifier.register(into: .shared)
        RNWBrightnessModifier.register(into: .shared)
        RNWContrastModifier.register(into: .shared)
        RNWSaturationModifier.register(into: .shared)
        RNWGrayscaleModifier.register(into: .shared)
        RNWHueRotationModifier.register(into: .shared)
        RNWColorInvertModifier.register(into: .shared)
        RNWColorMultiplyModifier.register(into: .shared)
        RNWBlendModeModifier.register(into: .shared)
        RNWLuminanceToAlphaModifier.register(into: .shared)
        RNWCompositingGroupModifier.register(into: .shared)
        RNWDrawingGroupModifier.register(into: .shared)
        RNWGeometryGroupModifier.register(into: .shared)
    }
}
