import SwiftUI

/// SwiftUI `.opacity(_:)`. Sets the transparency of the view (`0`…`1`).
enum RNWOpacityModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("opacity") { view, params, _ in
            AnyView(view.opacity(params.double("value") ?? 1))
        }
    }
}
