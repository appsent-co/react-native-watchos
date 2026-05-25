import SwiftUI

/// SwiftUI `.rotation3DEffect(_:axis:anchor:)`. Rotates the view about the
/// 3D axis `(x, y, z)` by `degrees`. Axis defaults to the Y axis `(0,1,0)`
/// when none of the components are supplied. `anchorZ` / `perspective` are
/// not bridged and use SwiftUI's defaults.
enum RNWRotation3DEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("rotation3DEffect") { view, params, _ in
            let degrees = params.double("degrees") ?? 0
            let x = params.cgFloat("axisX")
            let y = params.cgFloat("axisY")
            let z = params.cgFloat("axisZ")
            // Default to the Y axis only when no component is provided.
            let axis: (x: CGFloat, y: CGFloat, z: CGFloat)
            if x == nil, y == nil, z == nil {
                axis = (0, 1, 0)
            } else {
                axis = (x ?? 0, y ?? 0, z ?? 0)
            }
            let anchor = RNWTransformAnchor.unitPoint(params.string("anchor"))
            return AnyView(view.rotation3DEffect(
                .degrees(degrees),
                axis: axis,
                anchor: anchor
            ))
        }
    }
}
