import SwiftUI

/// Aggregator for the "Watch-specific" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWWatchModifiers {
    @MainActor
    static func registerAll() {
        RNWHandGestureShortcutModifier.register(into: .shared)
        RNWSensoryFeedbackModifier.register(into: .shared)
        RNWDigitalCrownRotationModifier.register(into: .shared)
        RNWDigitalCrownAccessoryModifier.register(into: .shared)
    }
}
