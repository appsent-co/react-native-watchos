import SwiftUI

/// SwiftUI `.multilineTextAlignment(_:)`. Sets how multi-line text within
/// the view is aligned. Defaults to `.center` for an absent/unrecognized
/// value (matching `RNWAlignmentParser.textAlignment`).
enum RNWMultilineTextAlignmentModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("multilineTextAlignment") { view, params, _ in
            let alignment = RNWAlignmentParser.textAlignment(params.string("value"))
            return AnyView(view.multilineTextAlignment(alignment))
        }
    }
}
