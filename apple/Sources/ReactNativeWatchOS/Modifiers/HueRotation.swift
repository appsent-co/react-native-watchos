import SwiftUI

/// SwiftUI `.hueRotation(_:)`. Shifts every color's hue by the given
/// angle (in degrees).
enum RNWHueRotationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("hueRotation") { view, params, _ in
            AnyView(view.hueRotation(.degrees(params.double("degrees") ?? 0)))
        }
    }
}
