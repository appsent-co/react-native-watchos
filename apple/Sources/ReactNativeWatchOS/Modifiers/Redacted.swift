import SwiftUI

/// SwiftUI `.redacted(reason:)`. Renders the subtree as a redacted
/// placeholder (skeleton / loading state). `RedactionReasons.placeholder`
/// is the only public reason on watchOS, so any value maps to it.
enum RNWRedactedModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("redacted") { view, _, _ in
            AnyView(view.redacted(reason: .placeholder))
        }
    }
}
