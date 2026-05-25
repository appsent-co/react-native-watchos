import SwiftUI

/// SwiftUI `.containerShape(_:)`. Sets the preferred container shape so
/// descendants (e.g. `.containerBackground`, container-relative button
/// borders) can clip to it. Available on watchOS 9+.
enum RNWContainerShapeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("containerShape") { view, params, _ in
            switch params.string("shape") {
            case "circle":
                return AnyView(view.containerShape(Circle()))
            case "capsule":
                return AnyView(view.containerShape(Capsule()))
            case "roundedRectangle":
                let radius = params.cgFloat("cornerRadius") ?? 0
                return AnyView(view.containerShape(
                    RoundedRectangle(cornerRadius: radius)
                ))
            default: // "rectangle" and anything unknown
                return AnyView(view.containerShape(Rectangle()))
            }
        }
    }
}
