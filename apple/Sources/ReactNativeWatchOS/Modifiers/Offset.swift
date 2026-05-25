import SwiftUI

/// SwiftUI `.offset(x:y:)`. Shifts the view after layout without affecting
/// the positions of surrounding views.
enum RNWOffsetModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("offset") { view, params, _ in
            AnyView(view.offset(
                x: params.cgFloat("x") ?? 0,
                y: params.cgFloat("y") ?? 0
            ))
        }
    }
}
