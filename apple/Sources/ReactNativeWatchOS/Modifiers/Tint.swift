import SwiftUI

/// SwiftUI `.tint(_:)`. Sets the tint color applied to controls and accessory
/// content within the view. Resolves `color` via `RNWColorParser`; leaves the
/// view unchanged when the string is unrecognized.
enum RNWTintModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("tint") { view, params, _ in
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            return AnyView(view.tint(color))
        }
    }
}
