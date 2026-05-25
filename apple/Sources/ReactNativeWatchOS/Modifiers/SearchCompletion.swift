import SwiftUI

/// SwiftUI `.searchCompletion(_:)`.
///
/// Associates a completion string with a search-suggestion view so tapping it
/// fills the search field. Available on watchOS 9+ (the bridge deployment
/// target), so no availability gate is needed.
///
/// Only takes visible effect when the view is presented as a search
/// suggestion (inside a `.searchSuggestions { … }` slot / searchable scope).
/// Applied to any other view the system treats it as an inert pass-through —
/// matching SwiftUI's own behaviour.
enum RNWSearchCompletionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("searchCompletion") { view, params, _ in
            guard let completion = params.string("completion") else { return view }
            return AnyView(view.searchCompletion(completion))
        }
    }
}
