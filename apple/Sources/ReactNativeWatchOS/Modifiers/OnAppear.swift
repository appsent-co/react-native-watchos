import SwiftUI

/// SwiftUI `.onAppear(perform:)`. Fires the JS `handler` when the view appears.
enum RNWOnAppearModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onAppear") { view, params, ctx in
            AnyView(view.onAppear { ctx.fire(params.int("handler")) })
        }
    }
}
