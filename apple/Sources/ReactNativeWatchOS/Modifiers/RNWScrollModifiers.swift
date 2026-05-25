import SwiftUI

/// Aggregator for the "Scroll" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call.
enum RNWScrollModifiers {
    @MainActor
    static func registerAll() {
        // watchOS 9+
        RNWScrollDisabledModifier.register(into: .shared)
        RNWScrollIndicatorsModifier.register(into: .shared)
        RNWScrollContentBackgroundModifier.register(into: .shared)
        RNWRefreshableModifier.register(into: .shared)
        // watchOS 10+ (gated; no-op on older systems)
        RNWScrollDismissesKeyboardModifier.register(into: .shared)
        RNWScrollTargetBehaviorModifier.register(into: .shared)
        RNWScrollTargetLayoutModifier.register(into: .shared)
        RNWScrollBounceBehaviorModifier.register(into: .shared)
        RNWScrollClipDisabledModifier.register(into: .shared)
        RNWDefaultScrollAnchorModifier.register(into: .shared)
        RNWContentMarginsModifier.register(into: .shared)
        RNWScrollPositionModifier.register(into: .shared)
    }
}
