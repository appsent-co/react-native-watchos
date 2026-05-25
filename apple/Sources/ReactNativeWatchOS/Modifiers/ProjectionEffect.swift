import SwiftUI

/// SwiftUI `.projectionEffect(_:)`. LIMITED: only the 2D affine subset is
/// bridged. The `ProjectionTransform` is built from a `CGAffineTransform`
/// (same `a,b,c,d,tx,ty` params as `transformEffect`) via
/// `ProjectionTransform(_ m: CGAffineTransform)`. Full 3D `CATransform3D`
/// projections cannot be expressed across the JS bridge and are NOT
/// supported here.
enum RNWProjectionEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("projectionEffect") { view, params, _ in
            let transform = RNWAffineTransform.make(from: params)
            return AnyView(view.projectionEffect(ProjectionTransform(transform)))
        }
    }
}
