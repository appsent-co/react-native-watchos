import SwiftUI

/// SwiftUI `.toggleStyle(_:)`. Maps the `style` string to a toggle style.
/// Unknown values fall back to `.automatic`.
enum RNWToggleStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toggleStyle") { view, params, _ in
            switch params.string("style") {
            case "button":
                return AnyView(view.toggleStyle(.button))
            case "switch":
                return AnyView(view.toggleStyle(.switch))
            default:
                return AnyView(view.toggleStyle(.automatic))
            }
        }
    }
}
