import SwiftUI

/// Aggregator for the "Toolbar polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call.
///
/// Not implemented (unavailable on watchOS), so deliberately absent rather
/// than silently no-op:
///   - `toolbarForegroundStyle(_:for:)` — iOS/macOS only; not in the watchOS
///     SDK, so it can't be referenced even under `#available`.
///   - `toolbarBackgroundVisibility(_:for:)` — watchOS 11+ only and newer than
///     this package's watchOS 9 deployment target can compile-guarantee;
///     `toolbarBackground` + `toolbarVisibility` cover its use cases here.
enum RNWToolbarModifiers {
    @MainActor
    static func registerAll() {
        RNWToolbarBackgroundModifier.register(into: .shared)
        RNWToolbarColorSchemeModifier.register(into: .shared)
        RNWToolbarVisibilityModifier.register(into: .shared)
        RNWToolbarTitleDisplayModeModifier.register(into: .shared)
        RNWToolbarTitleMenuModifier.register(into: .shared)
        RNWTabItemModifier.register(into: .shared)
    }
}
