import SwiftUI

/// SwiftUI `.accessibilityAction(_:_:)`. Registers a handler for a built-in
/// accessibility action. `kind` selects the action (`default`/`escape`/
/// `magicTap`), defaulting to `.default`; the handler fires the JS callback.
enum RNWAccessibilityActionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityAction") { view, params, ctx in
            let kind: AccessibilityActionKind
            switch params.string("kind") {
            case "escape":   kind = .escape
            case "magicTap": kind = .magicTap
            default:         kind = .default
            }
            let handler = params.int("handler")
            return AnyView(view.accessibilityAction(kind) { ctx.fire(handler) })
        }
    }
}
