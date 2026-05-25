import SwiftUI

/// SwiftUI `.navigationTransition(_:)` (watchOS 11+ / iOS 18+). Sets the
/// transition used when this view is pushed/popped in a navigation stack.
///
/// LIMITATION (v1): `type: "zoom"` needs a `matchedTransitionSource` sharing
/// a `@Namespace` with this view, which the bridge can't express across
/// nodes — so `"zoom"` falls back to `.automatic`. On watchOS < 11 the whole
/// modifier is a no-op (view passes through unchanged).
enum RNWNavigationTransitionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("navigationTransition") { view, params, _ in
            if #available(watchOS 11.0, *) {
                // Both "automatic" and the unsupported "zoom" resolve to the
                // automatic transition (see limitation above).
                return AnyView(view.navigationTransition(.automatic))
            }
            return view
        }
    }
}
