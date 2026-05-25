import SwiftUI

/// SwiftUI `.submitLabel(_:)`. Sets the semantic label rendered on the
/// keyboard's submit key. `SubmitLabel` and this modifier are watchOS 9+,
/// which matches the deployment target, so no availability gate is needed.
/// An unrecognized `label` falls back to `.done`.
enum RNWSubmitLabelModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("submitLabel") { view, params, _ in
            AnyView(view.submitLabel(parse(params.string("label"))))
        }
    }

    private static func parse(_ s: String?) -> SubmitLabel {
        switch s {
        case "done":     return .done
        case "go":       return .go
        case "send":     return .send
        case "join":     return .join
        case "route":    return .route
        case "search":   return .search
        case "return":   return .return
        case "next":     return .next
        case "continue": return .continue
        default:         return .done
        }
    }
}
