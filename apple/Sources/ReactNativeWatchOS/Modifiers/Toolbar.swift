import SwiftUI

/// SwiftUI `.toolbar { content }`. Adds toolbar items to a view inside a
/// `NavigationStack`. The `content` slot (resolved via `ctx.content`)
/// supplies the toolbar body.
///
/// LIMITATION: watchOS exposes only a narrow set of toolbar placements, so
/// this keeps it simple — the resolved content is handed to the trailing
/// `toolbar { }` builder and the system chooses placement. Per-item
/// `ToolbarItemPlacement` control is not exposed. When no content slot is
/// present the view is returned unchanged.
enum RNWToolbarModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbar") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            return AnyView(view.toolbar { body })
        }
    }
}
