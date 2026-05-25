import SwiftUI

/// Aggregator for the "Styling" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file.
///
/// NOTE: `background` is NOT registered here — the foundation already
/// registers `RNWBackgroundModifier` from `RNWRootView`. This unit only
/// extends that existing modifier with a content overload.
enum RNWStylingModifiers {
    @MainActor
    static func registerAll() {
        RNWForegroundStyleModifier.register(into: .shared)
        RNWBackgroundStyleModifier.register(into: .shared)
        RNWBorderModifier.register(into: .shared)
        RNWClipShapeModifier.register(into: .shared)
        RNWClippedModifier.register(into: .shared)
        RNWCornerRadiusModifier.register(into: .shared)
        RNWOpacityModifier.register(into: .shared)
        RNWShadowModifier.register(into: .shared)
        RNWTintModifier.register(into: .shared)
        RNWOverlayModifier.register(into: .shared)
        RNWMaskModifier.register(into: .shared)
    }
}
