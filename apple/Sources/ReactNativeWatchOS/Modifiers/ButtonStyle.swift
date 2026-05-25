import SwiftUI

/// SwiftUI `.buttonStyle(_:)`. Maps the `style` string to a primitive
/// button style. Unknown values fall back to `.automatic`.
enum RNWButtonStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("buttonStyle") { view, params, _ in
            switch params.string("style") {
            case "bordered":
                return AnyView(view.buttonStyle(.bordered))
            case "borderedProminent":
                return AnyView(view.buttonStyle(.borderedProminent))
            case "borderless":
                return AnyView(view.buttonStyle(.borderless))
            case "plain":
                return AnyView(view.buttonStyle(.plain))
            default:
                return AnyView(view.buttonStyle(.automatic))
            }
        }
    }
}
