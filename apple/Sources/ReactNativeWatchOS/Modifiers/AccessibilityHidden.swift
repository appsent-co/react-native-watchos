import SwiftUI

/// SwiftUI `.accessibilityHidden(_:)`. When `true` (the default when the
/// param is absent), hides the view and its children from assistive
/// technologies.
enum RNWAccessibilityHiddenModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityHidden") { view, params, _ in
            AnyView(view.accessibilityHidden(params.bool("value") ?? true))
        }
    }
}
