import SwiftUI

/// SwiftUI `.menuActionDismissBehavior(_:)`. Use `.disabled` to keep a menu
/// open after the user selects an action.
///
/// The API is available from watchOS 9.4; on earlier systems (9.0–9.3) the
/// view is returned unchanged.
enum RNWMenuActionDismissBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("menuActionDismissBehavior") { view, params, _ in
            guard #available(watchOS 9.4, *) else { return view }
            // `.disabled` is unavailable on watchOS; only `.enabled` and
            // `.automatic` exist here. "disabled" falls back to `.automatic`.
            switch params.string("behavior") {
            case "enabled":
                return AnyView(view.menuActionDismissBehavior(.enabled))
            default:
                return AnyView(view.menuActionDismissBehavior(.automatic))
            }
        }
    }
}
