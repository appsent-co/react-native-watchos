import SwiftUI

/// SwiftUI `.colorMultiply(_:)`. Multiplies the view's colors by the
/// parsed color. Falls through unchanged when the color string is
/// missing or unrecognized.
enum RNWColorMultiplyModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("colorMultiply") { view, params, _ in
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            return AnyView(view.colorMultiply(color))
        }
    }
}
