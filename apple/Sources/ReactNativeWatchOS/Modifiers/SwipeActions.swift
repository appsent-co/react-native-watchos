import SwiftUI

/// SwiftUI `.swipeActions(edge:allowsFullSwipe:) { … }`. Renders the content
/// slot (the action `Button`s) as swipe actions on a list row. `edge` maps
/// 'leading'/'trailing' to `HorizontalEdge` (default `.trailing`);
/// `allowsFullSwipe` defaults to true. No-ops when no content was provided.
enum RNWSwipeActionsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("swipeActions") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            let edge: HorizontalEdge = params.string("edge") == "leading" ? .leading : .trailing
            let allowsFullSwipe = params.bool("allowsFullSwipe") ?? true
            return AnyView(view.swipeActions(edge: edge, allowsFullSwipe: allowsFullSwipe) {
                body
            })
        }
    }
}
