import SwiftUI

/// SwiftUI `.buttonBorderShape(_:)`. Sets the shape a button uses to draw its
/// border (most visible with `.bordered`-family button styles).
///
/// `.capsule` / `.roundedRectangle` are available from watchOS 8; `.circle`
/// requires watchOS 10, so it falls back to `.automatic` on older systems.
enum RNWButtonBorderShapeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("buttonBorderShape") { view, params, _ in
            switch params.string("shape") {
            case "capsule":
                return AnyView(view.buttonBorderShape(.capsule))
            case "roundedRectangle":
                return AnyView(view.buttonBorderShape(.roundedRectangle))
            case "circle":
                if #available(watchOS 10.0, *) {
                    return AnyView(view.buttonBorderShape(.circle))
                }
                return AnyView(view.buttonBorderShape(.automatic))
            default:
                return AnyView(view.buttonBorderShape(.automatic))
            }
        }
    }
}
