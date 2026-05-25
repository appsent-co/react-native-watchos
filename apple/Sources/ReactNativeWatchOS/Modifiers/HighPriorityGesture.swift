import SwiftUI

/// SwiftUI `.highPriorityGesture(_:)`. Takes precedence over the view's own
/// gestures. Same v1 limitation as `gesture`: only `tap`/`longPress` bridge.
enum RNWHighPriorityGestureModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("highPriorityGesture") { view, params, ctx in
            RNWGestureSupport.apply(.highPriority, to: view, params: params, ctx: ctx)
        }
    }
}
