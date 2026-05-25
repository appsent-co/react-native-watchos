import SwiftUI

/// SwiftUI `.contentShape(_:)`. Sets the view's hit-testing region to a
/// simple shape. The shape branches are switched individually because each
/// concrete `Shape` type differs — a `RoundedRectangle` is not the same type
/// as a `Circle`. Defaults to `rectangle` when the param is missing/unknown.
enum RNWContentShapeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("contentShape") { view, params, _ in
            switch params.string("shape") {
            case "circle":
                return AnyView(view.contentShape(Circle()))
            case "capsule":
                return AnyView(view.contentShape(Capsule()))
            case "roundedRectangle":
                let radius = params.cgFloat("cornerRadius") ?? 0
                return AnyView(view.contentShape(
                    RoundedRectangle(cornerRadius: radius)
                ))
            default:
                return AnyView(view.contentShape(Rectangle()))
            }
        }
    }
}
