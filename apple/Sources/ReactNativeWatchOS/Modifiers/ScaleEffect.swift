import SwiftUI

/// SwiftUI `.scaleEffect(x:y:anchor:)`. Scales the view's rendered output
/// about `anchor`. `x` / `y` override the uniform `scale`; any axis left
/// unset falls back to `scale`, then to `1` (identity).
enum RNWScaleEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scaleEffect") { view, params, _ in
            let uniform = params.cgFloat("scale") ?? 1
            let x = params.cgFloat("x") ?? uniform
            let y = params.cgFloat("y") ?? uniform
            let anchor = RNWTransformAnchor.unitPoint(params.string("anchor"))
            return AnyView(view.scaleEffect(x: x, y: y, anchor: anchor))
        }
    }
}
