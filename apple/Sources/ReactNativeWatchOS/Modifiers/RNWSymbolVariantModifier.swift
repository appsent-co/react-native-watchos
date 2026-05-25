import SwiftUI

/// SwiftUI `.symbolVariant(_:)`. Substitutes a stylistic variant
/// (`SymbolVariants`) for SF Symbols inside the view. Registered in the
/// generic registry — it propagates through the environment to any Image.
enum RNWSymbolVariantModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("symbolVariant") { view, params, _ in
            switch params.string("variant") {
            case "none":      return AnyView(view.symbolVariant(.none))
            case "circle":    return AnyView(view.symbolVariant(.circle))
            case "square":    return AnyView(view.symbolVariant(.square))
            case "rectangle": return AnyView(view.symbolVariant(.rectangle))
            case "fill":      return AnyView(view.symbolVariant(.fill))
            case "slash":     return AnyView(view.symbolVariant(.slash))
            default:          return view
            }
        }
    }
}
