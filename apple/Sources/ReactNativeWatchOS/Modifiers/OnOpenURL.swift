import SwiftUI

/// SwiftUI `.onOpenURL(perform:)` (watchOS 9+). Fires the JS `handler` with
/// the opened URL's absolute string. On older systems it returns the view
/// unchanged.
enum RNWOnOpenURLModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onOpenURL") { view, params, ctx in
            let handlerId = params.int("handler")
            if #available(watchOS 9.0, *) {
                return AnyView(view.onOpenURL { url in
                    ctx.fire(handlerId, url.absoluteString)
                })
            }
            return view
        }
    }
}
