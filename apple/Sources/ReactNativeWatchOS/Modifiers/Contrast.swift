import SwiftUI

/// SwiftUI `.contrast(_:)`. Multiplies color contrast by `value`;
/// `1` leaves the view unchanged.
enum RNWContrastModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("contrast") { view, params, _ in
            AnyView(view.contrast(params.double("value") ?? 1))
        }
    }
}
