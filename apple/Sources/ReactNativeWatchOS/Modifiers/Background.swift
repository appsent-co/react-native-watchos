import SwiftUI

/// SwiftUI `.background(...)`. Two forms, picked by which param is present:
///   - `content` slot → `.background(alignment:content:)` with arbitrary
///     modifier-content view(s) drawn behind the view (resolved via
///     `ctx.content`).
///   - `color` string → `.background(_:)` with a flat color, resolved by
///     `RNWColorParser` so named SwiftUI colors (`primary`, `accent`) adapt
///     to dark mode automatically.
/// Returns the view unchanged when neither resolves.
enum RNWBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("background") { view, params, ctx in
            if let body = ctx.content(params.string("content")) {
                let alignment = RNWAlignmentParser.alignment(params.string("alignment"))
                return AnyView(view.background(alignment: alignment) { body })
            }
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            return AnyView(view.background(color))
        }
    }
}
