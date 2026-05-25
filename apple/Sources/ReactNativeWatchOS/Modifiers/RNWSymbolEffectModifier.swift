import SwiftUI

/// SwiftUI `.symbolEffect(_:)`. Applies an animated SF Symbol effect
/// (`SymbolEffect`) to symbols inside the view.
///
/// Availability:
/// - `.symbolEffect(_:)` itself requires **watchOS 10.0+**. On watchOS 9 the
///   modifier is a no-op (returns the view unchanged).
/// - `bounce`, `pulse`, `variableColor`, `scale`, `appear`, `disappear` are
///   available on watchOS 10.0+.
/// - `wiggle`, `breathe`, `rotate` require **watchOS 11.0+**; on watchOS 10
///   they are no-ops.
enum RNWSymbolEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("symbolEffect") { view, params, _ in
            guard #available(watchOS 10.0, *) else { return view }
            let effect = params.string("effect")
            switch effect {
            case "bounce":        return AnyView(view.symbolEffect(.bounce))
            case "pulse":         return AnyView(view.symbolEffect(.pulse))
            case "variableColor": return AnyView(view.symbolEffect(.variableColor))
            case "scale":         return AnyView(view.symbolEffect(.scale))
            case "appear":        return AnyView(view.symbolEffect(.appear))
            case "disappear":     return AnyView(view.symbolEffect(.disappear))
            case "wiggle":
                if #available(watchOS 11.0, *) {
                    return AnyView(view.symbolEffect(.wiggle))
                }
                return view
            case "breathe":
                if #available(watchOS 11.0, *) {
                    return AnyView(view.symbolEffect(.breathe))
                }
                return view
            case "rotate":
                if #available(watchOS 11.0, *) {
                    return AnyView(view.symbolEffect(.rotate))
                }
                return view
            default:
                return view
            }
        }
    }
}
