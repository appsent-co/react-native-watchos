import SwiftUI

/// SwiftUI `.searchSuggestions { … }`.
///
/// Supplies the suggestion views for a searchable context. The ViewBuilder
/// overload is available on watchOS 9.0+, which is this bridge's deployment
/// target, so the modifier is applied unconditionally — no `#available`
/// guard is needed (one would only emit an "always true" warning here).
///
/// The `content` param is a hoisted `__ModifierContent` slot resolved through
/// `ctx`. When the slot is absent the view is returned unchanged. Note the
/// suggestions only render when the view is also marked searchable; on a
/// non-searchable view SwiftUI treats this as an inert pass-through.
enum RNWSearchSuggestionsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("searchSuggestions") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            return AnyView(view.searchSuggestions { body })
        }
    }
}
