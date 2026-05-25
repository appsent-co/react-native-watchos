import SwiftUI

/// Maps a JS `bars` string to a `ToolbarPlacement` for the `for:` argument of
/// the toolbar modifiers. Only `.automatic` and `.navigationBar` are used:
/// they are the placements honored on watchOS (watchOS 9 safe). Unknown values
/// fall back to `.automatic`. Defined here and reused by the other toolbar
/// modifiers in this unit.
enum RNWToolbarPlacement {
    static func parse(_ s: String?) -> ToolbarPlacement {
        switch s {
        case "navigationBar": return .navigationBar
        default:              return .automatic
        }
    }
}

/// SwiftUI `.toolbarBackground(_:for:)` (watchOS 10+). Sets the background
/// shape style of the navigation bar. The `style` param is resolved by
/// `RNWShapeStyleParser` (named/hex color, hierarchical level, `tint`, or a
/// watchOS-10+ material). Returns the view unchanged on watchOS 9.
enum RNWToolbarBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbarBackground") { view, params, _ in
            guard let style = RNWShapeStyleParser.parse(params.string("style")) else {
                return view
            }
            if #available(watchOS 10.0, *) {
                return AnyView(view.toolbarBackground(
                    style,
                    for: RNWToolbarPlacement.parse(params.string("bars"))
                ))
            }
            return view
        }
    }
}
