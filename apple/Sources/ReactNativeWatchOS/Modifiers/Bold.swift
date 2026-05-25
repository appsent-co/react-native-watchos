import SwiftUI

/// SwiftUI `.bold(_:)`. Applies a bold font weight to text within the
/// view. Defaults to active when `value` is omitted.
enum RNWBoldModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("bold") { view, params, _ in
            AnyView(view.bold(params.bool("value") ?? true))
        }
    }
}
