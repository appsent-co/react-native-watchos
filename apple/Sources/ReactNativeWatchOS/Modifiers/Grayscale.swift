import SwiftUI

/// SwiftUI `.grayscale(_:)`. Desaturates by `value`; `0` is unchanged,
/// `1` is fully gray.
enum RNWGrayscaleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("grayscale") { view, params, _ in
            AnyView(view.grayscale(params.double("value") ?? 0))
        }
    }
}
