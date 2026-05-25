import SwiftUI

/// SwiftUI `.saturation(_:)`. Adjusts color saturation; `1` leaves the
/// view unchanged, `0` is grayscale.
enum RNWSaturationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("saturation") { view, params, _ in
            AnyView(view.saturation(params.double("value") ?? 1))
        }
    }
}
