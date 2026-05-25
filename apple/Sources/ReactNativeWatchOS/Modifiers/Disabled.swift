import SwiftUI

/// SwiftUI `.disabled(_:)`. Blocks interaction with the view and its
/// descendants when `value` is true.
enum RNWDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("disabled") { view, params, _ in
            AnyView(view.disabled(params.bool("value") ?? true))
        }
    }
}
