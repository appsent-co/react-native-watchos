import SwiftUI

/// SwiftUI `.accessibilityRemoveTraits(_:)`. Removes one or more traits.
/// `traits` is a single name or an array combined into one
/// `AccessibilityTraits` (see `RNWAccessibilityTraitsParser`).
enum RNWAccessibilityRemoveTraitsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityRemoveTraits") { view, params, _ in
            let traits = RNWAccessibilityTraitsParser.parse(params["traits"])
            return AnyView(view.accessibilityRemoveTraits(traits))
        }
    }
}
