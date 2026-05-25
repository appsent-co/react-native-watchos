import SwiftUI

/// SwiftUI `.zIndex(_:)`. Sets the front-to-back ordering of this view among
/// overlapping siblings in the same container. Defaults to `0`.
enum RNWZIndexModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("zIndex") { view, params, _ in
            AnyView(view.zIndex(params.double("value") ?? 0))
        }
    }
}
