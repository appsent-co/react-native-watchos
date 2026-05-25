import SwiftUI

/// SwiftUI `.privacySensitive(_:)`. Marks the subtree as private content so
/// the system can redact it when the device is in a privacy-sensitive state.
/// Defaults to `true`.
enum RNWPrivacySensitiveModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("privacySensitive") { view, params, _ in
            AnyView(view.privacySensitive(params.bool("value") ?? true))
        }
    }
}
