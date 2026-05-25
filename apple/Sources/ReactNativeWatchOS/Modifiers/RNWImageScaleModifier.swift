import SwiftUI

/// SwiftUI `.imageScale(_:)`. Sets the relative drawing size (`Image.Scale`)
/// of SF Symbols and images inside the view. Registered in the generic
/// registry — it propagates through the environment to any contained Image.
enum RNWImageScaleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("imageScale") { view, params, _ in
            switch params.string("scale") {
            case "small":  return AnyView(view.imageScale(.small))
            case "medium": return AnyView(view.imageScale(.medium))
            case "large":  return AnyView(view.imageScale(.large))
            default:       return view
            }
        }
    }
}
