import SwiftUI

/// SwiftUI `.tabItem { … }` (watchOS 7+). Sets the tab-bar label for a view
/// used as a page inside a `TabView`. The `content` slot is resolved via
/// `ctx`; with no content provided the view is returned unchanged.
enum RNWTabItemModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("tabItem") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            return AnyView(view.tabItem { body })
        }
    }
}
