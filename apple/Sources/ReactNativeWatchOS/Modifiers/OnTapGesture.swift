import SwiftUI

/// SwiftUI `.onTapGesture(count:perform:)`. Fires the JS `handler` after
/// `count` taps (default 1).
enum RNWOnTapGestureModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onTapGesture") { view, params, ctx in
            let count = params.int("count") ?? 1
            let handlerId = params.int("handler")
            return AnyView(view.onTapGesture(count: count) {
                ctx.fire(handlerId)
            })
        }
    }
}
