import SwiftUI

/// SwiftUI `.onSubmit(of:_:)`. Fires the JS `handler` when the user submits
/// via the matching trigger. `triggers` maps 'text'/'search' to
/// `SubmitTriggers` (default `.text`).
enum RNWOnSubmitModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onSubmit") { view, params, ctx in
            let handlerId = params.int("handler")
            let triggers = parseTriggers(params.string("triggers"))
            return AnyView(view.onSubmit(of: triggers) {
                ctx.fire(handlerId)
            })
        }
    }

    private static func parseTriggers(_ s: String?) -> SubmitTriggers {
        switch s {
        case "search": return .search
        default:       return .text
        }
    }
}
