import SwiftUI

/// SwiftUI `.labelStyle(_:)`. Maps the `style` string to a label style.
/// Unknown values fall back to `.automatic`.
enum RNWLabelStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("labelStyle") { view, params, _ in
            switch params.string("style") {
            case "iconOnly":
                return AnyView(view.labelStyle(.iconOnly))
            case "titleOnly":
                return AnyView(view.labelStyle(.titleOnly))
            case "titleAndIcon":
                return AnyView(view.labelStyle(.titleAndIcon))
            default:
                return AnyView(view.labelStyle(.automatic))
            }
        }
    }
}
