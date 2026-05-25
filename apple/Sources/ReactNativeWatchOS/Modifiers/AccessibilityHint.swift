import SwiftUI

/// SwiftUI `.accessibilityHint(_:)`. Describes the outcome of the view's
/// action; read by VoiceOver after the label.
enum RNWAccessibilityHintModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityHint") { view, params, _ in
            AnyView(view.accessibilityHint(Text(params.string("hint") ?? "")))
        }
    }
}
