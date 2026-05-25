import SwiftUI

/// SwiftUI `.font(_:)`. Supports semantic styles (`.body`, `.title`, …)
/// and explicit `Font.system(size:weight:)` constructions. Registered in
/// the generic registry — works on Text and any other view that has
/// inheritable typography (Label, Button, etc.).
enum RNWFontModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("font") { view, params, _ in
            let weight = parseWeight(params.string("weight"))
            let font: Font
            if let style = params.string("style") {
                font = applyingWeight(weight, to: semanticFont(style))
            } else if let size = params.double("size") {
                font = .system(size: size, weight: weight ?? .regular)
            } else {
                return view
            }
            return AnyView(view.font(font))
        }
    }

    private static func semanticFont(_ style: String) -> Font {
        switch style {
        case "largeTitle":   return .largeTitle
        case "title":        return .title
        case "title2":       return .title2
        case "title3":       return .title3
        case "headline":     return .headline
        case "subheadline":  return .subheadline
        case "body":         return .body
        case "callout":      return .callout
        case "footnote":     return .footnote
        case "caption":      return .caption
        case "caption2":     return .caption2
        default:             return .body
        }
    }

    private static func parseWeight(_ s: String?) -> Font.Weight? {
        switch s {
        case "ultraLight": return .ultraLight
        case "thin":       return .thin
        case "light":      return .light
        case "regular":    return .regular
        case "medium":     return .medium
        case "semibold":   return .semibold
        case "bold":       return .bold
        case "heavy":      return .heavy
        case "black":      return .black
        default:           return nil
        }
    }

    /// `.weight()` on a semantic Font is the SwiftUI-idiomatic way to
    /// keep the semantic sizing/dynamic-type behavior while overriding
    /// stroke weight (vs. `.system(size:weight:)` which loses both).
    private static func applyingWeight(
        _ weight: Font.Weight?, to font: Font
    ) -> Font {
        guard let weight else { return font }
        return font.weight(weight)
    }
}
