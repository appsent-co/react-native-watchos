import SwiftUI

/// SwiftUI `.interactiveDismissDisabled(_:)`. Conditionally prevents
/// interactive (swipe) dismissal of the presentation it is applied to.
/// `value` defaults to true. Available on watchOS 9+.
enum RNWInteractiveDismissDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("interactiveDismissDisabled") { view, params, _ in
            AnyView(view.interactiveDismissDisabled(params.bool("value") ?? true))
        }
    }
}
