import SwiftUI

/// SwiftUI `.moveDisabled(_:)`. Prevents a row in an editable `List` /
/// `ForEach` from being reordered. Defaults to `true` when unspecified.
enum RNWMoveDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("moveDisabled") { view, params, _ in
            AnyView(view.moveDisabled(params.bool("value") ?? true))
        }
    }
}
