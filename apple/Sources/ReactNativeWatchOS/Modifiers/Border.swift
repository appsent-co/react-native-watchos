import SwiftUI

/// SwiftUI `.border(_:width:)`. Draws a border of `color` (resolved by
/// `RNWColorParser`) and `width` (default `1`) around the view's edges.
/// Leaves the view unchanged when the color string is unrecognized.
enum RNWBorderModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("border") { view, params, _ in
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            let width = params.cgFloat("width") ?? 1
            return AnyView(view.border(color, width: width))
        }
    }
}
