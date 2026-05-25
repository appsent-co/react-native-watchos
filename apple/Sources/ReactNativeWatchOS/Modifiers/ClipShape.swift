import SwiftUI

/// SwiftUI `.clipShape(_:)`. Clips the view to one of a fixed set of shapes.
/// `roundedRectangle` reads `cornerRadius` (default `0`). Each branch calls
/// `.clipShape` with the concrete shape type, avoiding `AnyShape` so the
/// minimum deployment target stays unconstrained.
enum RNWClipShapeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("clipShape") { view, params, _ in
            switch params.string("shape") {
            case "circle":
                return AnyView(view.clipShape(Circle()))
            case "capsule":
                return AnyView(view.clipShape(Capsule()))
            case "ellipse":
                return AnyView(view.clipShape(Ellipse()))
            case "roundedRectangle":
                let radius = params.cgFloat("cornerRadius") ?? 0
                return AnyView(view.clipShape(RoundedRectangle(cornerRadius: radius)))
            default:
                return AnyView(view.clipShape(Rectangle()))
            }
        }
    }
}
