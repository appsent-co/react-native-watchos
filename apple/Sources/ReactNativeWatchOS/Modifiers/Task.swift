import SwiftUI

/// SwiftUI `.task(_:)`. Runs once when the view appears; the bridged async
/// task simply invokes the JS `handler` (it does no awaiting itself).
enum RNWTaskModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("task") { view, params, ctx in
            let handlerId = params.int("handler")
            return AnyView(view.task {
                ctx.fire(handlerId)
            })
        }
    }
}
