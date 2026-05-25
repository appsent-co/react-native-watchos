import SwiftUI

/// SwiftUI `.compositingGroup()`. Composites descendants as one layer
/// before effects (opacity, blend modes) apply.
enum RNWCompositingGroupModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("compositingGroup") { view, _, _ in
            AnyView(view.compositingGroup())
        }
    }
}
