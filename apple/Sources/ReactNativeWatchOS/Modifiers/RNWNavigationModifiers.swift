import SwiftUI

/// Aggregator for the "Navigation & presentation" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWNavigationModifiers {
    @MainActor
    static func registerAll() {
        RNWNavigationBarBackButtonHiddenModifier.register(into: .shared)
        RNWSearchableModifier.register(into: .shared)
        RNWNavigationDestinationModifier.register(into: .shared)
        RNWSheetModifier.register(into: .shared)
        RNWFullScreenCoverModifier.register(into: .shared)
        RNWAlertModifier.register(into: .shared)
        RNWConfirmationDialogModifier.register(into: .shared)
        RNWToolbarModifier.register(into: .shared)
    }
}
