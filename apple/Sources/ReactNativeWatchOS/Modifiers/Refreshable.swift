import SwiftUI

/// SwiftUI `.refreshable { … }`. Marks the view as refreshable and fires
/// the JS `handler` when the user triggers pull-to-refresh. The SwiftUI
/// closure is async, but the bridge can't await JS work, so we fire the
/// handler and return immediately — the refresh indicator dismisses once
/// the (synchronous) fire returns. Available watchOS 9+.
enum RNWRefreshableModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("refreshable") { view, params, ctx in
            let handlerId = params.int("handler")
            return AnyView(view.refreshable {
                ctx.fire(handlerId)
            })
        }
    }
}
