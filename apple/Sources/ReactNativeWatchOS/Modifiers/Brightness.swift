import SwiftUI

/// SwiftUI `.brightness(_:)`. Adds `value` to each color component;
/// `0` leaves the view unchanged.
enum RNWBrightnessModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("brightness") { view, params, _ in
            AnyView(view.brightness(params.double("value") ?? 0))
        }
    }
}
