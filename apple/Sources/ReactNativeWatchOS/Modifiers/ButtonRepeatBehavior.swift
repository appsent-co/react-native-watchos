import SwiftUI

/// SwiftUI `.buttonRepeatBehavior(_:)`. Controls whether descendant buttons
/// fire their action repeatedly while held down.
///
/// Requires watchOS 10; on earlier systems the view is returned unchanged.
enum RNWButtonRepeatBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("buttonRepeatBehavior") { view, params, _ in
            guard #available(watchOS 10.0, *) else { return view }
            switch params.string("behavior") {
            case "enabled":  return AnyView(view.buttonRepeatBehavior(.enabled))
            case "disabled": return AnyView(view.buttonRepeatBehavior(.disabled))
            default:         return AnyView(view.buttonRepeatBehavior(.automatic))
            }
        }
    }
}
