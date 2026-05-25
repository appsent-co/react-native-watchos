import SwiftUI

/// SwiftUI `.frame(...)`. Two overloads picked by which keys are present:
///   - `width` or `height`   → `.frame(width:height:alignment:)`
///   - otherwise             → `.frame(minWidth:maxWidth:…:alignment:)`
///
/// Pass `Infinity` from JS for `maxWidth` / `maxHeight` to fill available
/// space — Hermes preserves it through JSI as a Double, which CGFloat
/// converts to `.infinity` and SwiftUI accepts directly.
enum RNWFrameModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("frame") { view, params, _ in
            let alignment = parseAlignment(params.string("alignment")) ?? .center
            let w = params.cgFloat("width")
            let h = params.cgFloat("height")
            if w != nil || h != nil {
                return AnyView(view.frame(width: w, height: h, alignment: alignment))
            }
            return AnyView(view.frame(
                minWidth: params.cgFloat("minWidth"),
                maxWidth: params.cgFloat("maxWidth"),
                minHeight: params.cgFloat("minHeight"),
                maxHeight: params.cgFloat("maxHeight"),
                alignment: alignment
            ))
        }
    }

    private static func parseAlignment(_ s: String?) -> Alignment? {
        switch s {
        case "leading":        return .leading
        case "trailing":       return .trailing
        case "center":         return .center
        case "top":            return .top
        case "bottom":         return .bottom
        case "topLeading":     return .topLeading
        case "topTrailing":    return .topTrailing
        case "bottomLeading":  return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        default:               return nil
        }
    }
}
