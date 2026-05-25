import SwiftUI

/// SwiftUI `.fontWeight(_:)`. Sets the stroke weight of text within the
/// view. An unrecognized (or absent) weight leaves the view unchanged.
enum RNWFontWeightModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("fontWeight") { view, params, _ in
            guard let weight = RNWFontParsers.weight(params.string("weight")) else {
                return view
            }
            return AnyView(view.fontWeight(weight))
        }
    }
}
