import SwiftUI

/// SwiftUI `.scrollDisabled(_:)`. Disables (or re-enables) scrolling of
/// scrollable containers nested in this view. Available watchOS 9+.
enum RNWScrollDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollDisabled") { view, params, _ in
            AnyView(view.scrollDisabled(params.bool("disabled") ?? true))
        }
    }
}
