import SwiftUI

/// SwiftUI `.allowsTightening(_:)`. Lets the view compress inter-character
/// spacing to fit text before truncating. Registered in the generic
/// registry. Defaults to `true` when the value is absent.
enum RNWAllowsTighteningModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("allowsTightening") { view, params, _ in
            AnyView(view.allowsTightening(params.bool("value") ?? true))
        }
    }
}
