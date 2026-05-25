import SwiftUI

/// SwiftUI `.listRowBackground(_:)`. Renders the modifier-content view
/// (hoisted across the bridge under the `content` slot) behind a `List`
/// row. Falls back to the view unchanged when no content was provided.
enum RNWListRowBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("listRowBackground") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            return AnyView(view.listRowBackground(body))
        }
    }
}
