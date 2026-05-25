import SwiftUI

/// SwiftUI `.shadow(color:radius:x:y:)`. Draws a drop shadow. When `color`
/// is omitted or unrecognized, falls through to `.shadow(radius:x:y:)` so
/// SwiftUI's default translucent-black shadow color is used.
enum RNWShadowModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("shadow") { view, params, _ in
            let radius = params.cgFloat("radius") ?? 0
            let x = params.cgFloat("x") ?? 0
            let y = params.cgFloat("y") ?? 0
            if let colorString = params.string("color"),
               let color = RNWColorParser.parse(colorString) {
                return AnyView(view.shadow(color: color, radius: radius, x: x, y: y))
            }
            return AnyView(view.shadow(radius: radius, x: x, y: y))
        }
    }
}
