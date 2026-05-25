import SwiftUI

/// SwiftUI `.headerProminence(_:)`. Sets the `Prominence` of section headers
/// in the view — `.increased` emphasizes list section headers.
enum RNWHeaderProminenceModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("headerProminence") { view, params, _ in
            AnyView(view.headerProminence(parse(params.string("value"))))
        }
    }

    private static func parse(_ s: String?) -> Prominence {
        s == "increased" ? .increased : .standard
    }
}
