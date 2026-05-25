import SwiftUI

/// SwiftUI `.accessibilityLabel(_:)`. Overrides the label VoiceOver reads to
/// identify the view.
enum RNWAccessibilityLabelModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityLabel") { view, params, _ in
            AnyView(view.accessibilityLabel(Text(params.string("label") ?? "")))
        }
    }
}
