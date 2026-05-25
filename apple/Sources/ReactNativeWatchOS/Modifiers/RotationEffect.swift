import SwiftUI

/// Maps a named anchor string to a `UnitPoint` for transform modifiers.
/// Kept namespaced (rather than a free function) to avoid colliding with
/// the gradient views' `parseUnitPoint`. Defaults to `.center`.
enum RNWTransformAnchor {
    static func unitPoint(_ s: String?) -> UnitPoint {
        switch s {
        case "top":            return .top
        case "bottom":         return .bottom
        case "leading":        return .leading
        case "trailing":       return .trailing
        case "topLeading":     return .topLeading
        case "topTrailing":    return .topTrailing
        case "bottomLeading":  return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        default:               return .center
        }
    }
}

/// SwiftUI `.rotationEffect(_:anchor:)`. Rotates the view in 2D by
/// `degrees` about `anchor` without affecting its layout.
enum RNWRotationEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("rotationEffect") { view, params, _ in
            let degrees = params.double("degrees") ?? 0
            let anchor = RNWTransformAnchor.unitPoint(params.string("anchor"))
            return AnyView(view.rotationEffect(.degrees(degrees), anchor: anchor))
        }
    }
}
