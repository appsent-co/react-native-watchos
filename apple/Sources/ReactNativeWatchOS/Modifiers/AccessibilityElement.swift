import SwiftUI

/// SwiftUI `.accessibilityElement(children:)`. Creates an accessibility
/// element for the view, controlling how its children participate.
/// `children` maps to `AccessibilityChildBehavior`; defaults to `.ignore`.
enum RNWAccessibilityElementModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityElement") { view, params, _ in
            let behavior: AccessibilityChildBehavior
            switch params.string("children") {
            case "combine": behavior = .combine
            case "contain": behavior = .contain
            default:        behavior = .ignore
            }
            return AnyView(view.accessibilityElement(children: behavior))
        }
    }
}
