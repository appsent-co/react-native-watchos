import SwiftUI

/// SwiftUI `.symbolRenderingMode(_:)`. Picks the colour-rendering strategy
/// (`SymbolRenderingMode`) for SF Symbols inside the view. Registered in the
/// generic registry — it propagates through the environment to any Image.
enum RNWSymbolRenderingModeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("symbolRenderingMode") { view, params, _ in
            switch params.string("mode") {
            case "monochrome":   return AnyView(view.symbolRenderingMode(.monochrome))
            case "hierarchical": return AnyView(view.symbolRenderingMode(.hierarchical))
            case "palette":      return AnyView(view.symbolRenderingMode(.palette))
            case "multicolor":   return AnyView(view.symbolRenderingMode(.multicolor))
            default:             return view
            }
        }
    }
}
