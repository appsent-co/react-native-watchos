import SwiftUI

/// SwiftUI `.glassEffect(_:in:)` — watchOS 26 "Liquid Glass". Applies a
/// Liquid Glass material to the view, clipped to a shape.
///
/// `variant` selects the `Glass` material (`regular` / `clear` / `identity`),
/// `shape` the clip (`capsule` / `rect` / `circle` / `roundedRectangle`,
/// the last reading `cornerRadius`). Defaults: `.regular` in `.capsule`.
///
/// Gated to watchOS 26+ — returns the view unchanged on older OS, since
/// these APIs don't exist before "Liquid Glass".
enum RNWGlassEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("glassEffect") { view, params, _ in
            guard #available(watchOS 26.0, *) else { return view }

            let glass = makeGlass(params.string("variant"))
            let shape = params.string("shape") ?? "capsule"
            let cornerRadius = params.cgFloat("cornerRadius") ?? 0

            // `glassEffect(_:in:)` takes `some Shape`, so the shape can't be
            // type-erased without losing its identity for the morph system.
            // Branch per concrete shape instead.
            switch shape {
            case "rect":
                return AnyView(view.glassEffect(glass, in: Rectangle()))
            case "circle":
                return AnyView(view.glassEffect(glass, in: Circle()))
            case "roundedRectangle":
                return AnyView(view.glassEffect(
                    glass,
                    in: RoundedRectangle(cornerRadius: cornerRadius)
                ))
            default:
                return AnyView(view.glassEffect(glass, in: Capsule()))
            }
        }
    }

    @available(watchOS 26.0, *)
    private static func makeGlass(_ variant: String?) -> Glass {
        switch variant {
        case "clear":    return .clear
        case "identity": return .identity
        default:         return .regular
        }
    }
}
