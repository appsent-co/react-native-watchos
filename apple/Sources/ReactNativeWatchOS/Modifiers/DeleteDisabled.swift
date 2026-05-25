import SwiftUI

/// SwiftUI `.deleteDisabled(_:)`. Prevents a row in an editable `List` /
/// `ForEach` from being deleted. Defaults to `true` when unspecified.
enum RNWDeleteDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("deleteDisabled") { view, params, _ in
            AnyView(view.deleteDisabled(params.bool("value") ?? true))
        }
    }
}
