import SwiftUI

/// SwiftUI `.onDisappear(perform:)`. Fires the JS `handler` when the view
/// disappears.
enum RNWOnDisappearModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onDisappear") { view, params, ctx in
            AnyView(view.onDisappear { ctx.fire(params.int("handler")) })
        }
    }
}
