import SwiftUI

/// SwiftUI `.glassEffectTransition(_:)` — watchOS 26 "Liquid Glass".
/// Selects how a glass element animates as it's inserted or removed.
///
/// `transition`: `materialize` (default Liquid Glass materialize),
/// `identity` (no transition), or `matchedGeometry` (driven from a
/// matched-geometry source).
///
/// Gated to watchOS 26+ — returns the view unchanged on older OS.
enum RNWGlassEffectTransitionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("glassEffectTransition") { view, params, _ in
            guard #available(watchOS 26.0, *) else { return view }

            let transition: GlassEffectTransition
            switch params.string("transition") {
            case "identity":
                transition = .identity
            case "matchedGeometry":
                transition = .matchedGeometry
            default:
                transition = .materialize
            }
            return AnyView(view.glassEffectTransition(transition))
        }
    }
}
