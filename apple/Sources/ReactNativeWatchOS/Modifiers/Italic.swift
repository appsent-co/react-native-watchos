import SwiftUI

/// SwiftUI `.italic(_:)`. Applies italics to text within the view.
/// Defaults to active when `value` is omitted.
enum RNWItalicModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("italic") { view, params, _ in
            AnyView(view.italic(params.bool("value") ?? true))
        }
    }
}
