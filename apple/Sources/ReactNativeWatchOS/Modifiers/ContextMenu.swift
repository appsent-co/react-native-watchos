import SwiftUI

/// SwiftUI `.contextMenu { … }`. Renders the menu-items content slot as the
/// context menu body. No-ops (returns the view unchanged) when no content was
/// provided.
enum RNWContextMenuModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("contextMenu") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            return AnyView(view.contextMenu { body })
        }
    }
}
