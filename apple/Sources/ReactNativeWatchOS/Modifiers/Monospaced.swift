import SwiftUI

/// SwiftUI `.monospaced(_:)`. Renders text within the view with a fixed-
/// width (monospaced) font. Defaults to active when `value` is omitted.
enum RNWMonospacedModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("monospaced") { view, params, _ in
            AnyView(view.monospaced(params.bool("value") ?? true))
        }
    }
}
