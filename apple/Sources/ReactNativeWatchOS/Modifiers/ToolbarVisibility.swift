import SwiftUI

/// SwiftUI bar visibility. The newer `.toolbarVisibility(_:for:)` (watchOS 11+)
/// is intentionally not referenced so this compiles against the watchOS 9
/// deployment target; instead it uses the watchOS-9 `.toolbar(_ Visibility,
/// for:)`, which is the API `.toolbarVisibility` later renamed. `visibility`
/// is resolved by `RNWVisibilityParser` (`automatic`/`visible`/`hidden`).
enum RNWToolbarVisibilityModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbarVisibility") { view, params, _ in
            AnyView(view.toolbar(
                RNWVisibilityParser.parse(params.string("visibility")),
                for: RNWToolbarPlacement.parse(params.string("bars"))
            ))
        }
    }
}
