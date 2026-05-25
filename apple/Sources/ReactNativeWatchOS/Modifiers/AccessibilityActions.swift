import SwiftUI

/// SwiftUI `.accessibilityActions(_:)` (watchOS 10+). Declares a set of
/// custom accessibility actions from the content slot. On watchOS 9 the
/// view is returned unchanged.
enum RNWAccessibilityActionsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityActions") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            if #available(watchOS 10.0, *) {
                return AnyView(view.accessibilityActions { body })
            }
            return view
        }
    }
}
