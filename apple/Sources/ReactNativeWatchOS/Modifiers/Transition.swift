import SwiftUI

/// SwiftUI `.transition(_:)`. Maps the JS `type` preset to an
/// `AnyTransition`; `move` additionally reads an `edge` ('top'/'bottom'/
/// 'leading'/'trailing', defaulting to `.bottom`).
enum RNWTransitionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("transition") { view, params, _ in
            let type = params.string("type") ?? "opacity"
            return AnyView(view.transition(make(type: type, edge: params.string("edge"))))
        }
    }

    private static func make(type: String, edge: String?) -> AnyTransition {
        switch type {
        case "slide":    return .slide
        case "scale":    return .scale
        case "identity": return .identity
        case "move":     return .move(edge: parseEdge(edge))
        default:         return .opacity
        }
    }

    private static func parseEdge(_ s: String?) -> Edge {
        switch s {
        case "top":      return .top
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .bottom
        }
    }
}
