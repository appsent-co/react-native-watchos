import SwiftUI

/// SwiftUI `.springLoadingBehavior(_:)` (watchOS 10+). Controls whether a
/// control spring-loads when a dragged item hovers over it. On watchOS 9 the
/// API is unavailable, so the view is returned unchanged.
enum RNWSpringLoadingBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("springLoadingBehavior") { view, params, _ in
            guard #available(watchOS 10.0, *) else { return view }
            let behavior: SpringLoadingBehavior
            switch params.string("value") {
            case "enabled":  behavior = .enabled
            case "disabled": behavior = .disabled
            default:         behavior = .automatic
            }
            return AnyView(view.springLoadingBehavior(behavior))
        }
    }
}
