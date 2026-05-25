import SwiftUI

/// SwiftUI `.fontDesign(_:)`. Overrides the font design (e.g. `.rounded`,
/// `.serif`) for text within the view. The `View`-level modifier is
/// watchOS 9.1+, so it's gated and degrades to an unchanged view on 9.0.
/// An unrecognized design string also leaves the view unchanged.
enum RNWFontDesignModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("fontDesign") { view, params, _ in
            guard let design = RNWFontParsers.design(params.string("design")) else {
                return view
            }
            if #available(watchOS 9.1, *) {
                return AnyView(view.fontDesign(design))
            }
            return view
        }
    }
}
