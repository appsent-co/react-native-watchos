import Combine
import SwiftUI

/// SwiftUI `.onReceive(_:perform:)`.
///
/// LIMITATION: `.onReceive` takes an arbitrary Combine publisher, which has no
/// JS equivalent. We map it to `NotificationCenter.default.publisher(for:)`
/// keyed by a `name` string and fire the JS `handler` on each delivery. With
/// no `name`, the modifier is a no-op (returns the view unchanged).
enum RNWOnReceiveModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onReceive") { view, params, ctx in
            guard let name = params.string("name") else { return view }
            let handlerId = params.int("handler")
            let publisher = NotificationCenter.default.publisher(
                for: Notification.Name(name)
            )
            return AnyView(view.onReceive(publisher) { _ in
                ctx.fire(handlerId)
            })
        }
    }
}
