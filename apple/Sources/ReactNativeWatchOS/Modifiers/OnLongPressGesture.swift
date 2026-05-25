import SwiftUI

/// SwiftUI `.onLongPressGesture(minimumDuration:perform:)`. Fires the JS
/// `handler` once the press is held for `minimumDuration` seconds (default
/// 0.5, matching SwiftUI).
enum RNWOnLongPressGestureModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onLongPressGesture") { view, params, ctx in
            let minimumDuration = params.double("minimumDuration") ?? 0.5
            let handlerId = params.int("handler")
            return AnyView(view.onLongPressGesture(minimumDuration: minimumDuration) {
                ctx.fire(handlerId)
            })
        }
    }
}
