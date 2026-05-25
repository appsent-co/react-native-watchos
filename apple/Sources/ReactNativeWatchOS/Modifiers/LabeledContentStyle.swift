import SwiftUI

/// SwiftUI `.labeledContentStyle(_:)`. `LabeledContent` and its
/// `.automatic` style are available on watchOS 9 (the deployment target),
/// so no availability gating is required. Only `.automatic` is exposed —
/// any other value also resolves to `.automatic`.
enum RNWLabeledContentStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("labeledContentStyle") { view, _, _ in
            AnyView(view.labeledContentStyle(.automatic))
        }
    }
}
