import SwiftUI

/// SwiftUI `.simultaneousGesture(_:)`. Recognizes alongside the view's own
/// gestures. Same v1 limitation as `gesture`: only `tap`/`longPress` bridge.
enum RNWSimultaneousGestureModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("simultaneousGesture") { view, params, ctx in
            RNWGestureSupport.apply(.simultaneous, to: view, params: params, ctx: ctx)
        }
    }
}
