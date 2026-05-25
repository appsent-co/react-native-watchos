import SwiftUI

/// SwiftUI `.preferredColorScheme(_:)`. Sets the preferred `ColorScheme` for
/// the enclosing presentation. A `nil`/absent `value` clears the preference
/// so the presentation follows the system appearance.
enum RNWPreferredColorSchemeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("preferredColorScheme") { view, params, _ in
            // `parse` returns nil for a missing/null value, which maps to the
            // `ColorScheme?` "no preference" case SwiftUI expects.
            AnyView(view.preferredColorScheme(RNWColorSchemeModifier.parse(params.string("value"))))
        }
    }
}
