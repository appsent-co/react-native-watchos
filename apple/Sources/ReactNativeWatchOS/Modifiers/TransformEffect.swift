import SwiftUI

/// Builds a `CGAffineTransform` from the bridged `a,b,c,d,tx,ty` params.
/// Omitted components default to the identity matrix (`a = d = 1`).
/// Shared by `transformEffect` and `projectionEffect`.
enum RNWAffineTransform {
    static func make(from params: [String: Any]) -> CGAffineTransform {
        CGAffineTransform(
            a: params.cgFloat("a") ?? 1,
            b: params.cgFloat("b") ?? 0,
            c: params.cgFloat("c") ?? 0,
            d: params.cgFloat("d") ?? 1,
            tx: params.cgFloat("tx") ?? 0,
            ty: params.cgFloat("ty") ?? 0
        )
    }
}

/// SwiftUI `.transformEffect(_:)`. Applies an arbitrary 2D affine
/// transform to the view's rendered output (layout is unaffected).
enum RNWTransformEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("transformEffect") { view, params, _ in
            AnyView(view.transformEffect(RNWAffineTransform.make(from: params)))
        }
    }
}
