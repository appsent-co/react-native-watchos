import SwiftUI

/// SwiftUI `.position(x:y:)`. Centers the view at an absolute point in its
/// parent's coordinate space, ignoring its own layout-assigned position.
enum RNWPositionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("position") { view, params, _ in
            AnyView(view.position(
                x: params.cgFloat("x") ?? 0,
                y: params.cgFloat("y") ?? 0
            ))
        }
    }
}
