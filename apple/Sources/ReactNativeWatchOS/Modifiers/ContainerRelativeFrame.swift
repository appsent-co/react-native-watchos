import SwiftUI

/// SwiftUI `.containerRelativeFrame(_:alignment:)`. Sizes the view relative
/// to its nearest container. Requires watchOS 10+; on watchOS 9 the view is
/// returned unchanged.
enum RNWContainerRelativeFrameModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("containerRelativeFrame") { view, params, _ in
            guard #available(watchOS 10.0, *) else { return view }
            let axes = axisSet(params.string("axes"))
            let alignment = RNWAlignmentParser.alignment(params.string("alignment"))
            return AnyView(view.containerRelativeFrame(axes, alignment: alignment))
        }
    }

    private static func axisSet(_ s: String?) -> Axis.Set {
        switch s {
        case "horizontal": return .horizontal
        case "vertical":   return .vertical
        default:           return [.horizontal, .vertical] // "both" / nil
        }
    }
}
