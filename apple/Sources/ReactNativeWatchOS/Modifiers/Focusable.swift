import SwiftUI

/// SwiftUI `.focusable(_:)`. Marks the view as able (or unable) to receive
/// focus via the Digital Crown / accessibility focus. The `value` param
/// defaults to `true` when absent.
enum RNWFocusableModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("focusable") { view, params, _ in
            let value = params.bool("value") ?? true
            return AnyView(view.focusable(value))
        }
    }
}
