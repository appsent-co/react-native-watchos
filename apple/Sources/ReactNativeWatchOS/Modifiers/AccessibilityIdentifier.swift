import SwiftUI

/// SwiftUI `.accessibilityIdentifier(_:)`. Sets a non-localized identifier
/// used by UI tests; not spoken by VoiceOver.
enum RNWAccessibilityIdentifierModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityIdentifier") { view, params, _ in
            AnyView(view.accessibilityIdentifier(params.string("identifier") ?? ""))
        }
    }
}
