import SwiftUI

/// SwiftUI `.listItemTint(_:)`. Tints list-item content. The color string
/// is resolved by `RNWColorParser` so named SwiftUI colors adapt to dark
/// mode. Unrecognized / missing color → view unchanged.
enum RNWListItemTintModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("listItemTint") { view, params, _ in
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            return AnyView(view.listItemTint(color))
        }
    }
}
