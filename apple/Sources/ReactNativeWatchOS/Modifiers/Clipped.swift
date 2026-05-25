import SwiftUI

/// SwiftUI `.clipped()`. Clips the view to its bounding frame.
enum RNWClippedModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("clipped") { view, _, _ in
            AnyView(view.clipped())
        }
    }
}
