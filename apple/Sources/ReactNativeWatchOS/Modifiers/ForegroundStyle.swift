import SwiftUI

/// SwiftUI `.foregroundStyle(_:)`. Resolves the `style` string through the
/// shared `RNWShapeStyleParser` (named/hex color, hierarchical level, tint,
/// or watchOS-10+ material). Leaves the view unchanged when the string is
/// unrecognized so callers see a graceful fallback.
enum RNWForegroundStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("foregroundStyle") { view, params, _ in
            guard let style = RNWShapeStyleParser.parse(params.string("style")) else {
                return view
            }
            return AnyView(view.foregroundStyle(style))
        }
    }
}
