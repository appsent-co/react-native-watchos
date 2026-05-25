import SwiftUI

/// SwiftUI `.selectionDisabled(_:)` (watchOS 10+). Prevents the view (e.g.
/// a `List` row) from being selected. Defaults to `true`. No-op on
/// watchOS 9 (returns the view unchanged).
enum RNWSelectionDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("selectionDisabled") { view, params, _ in
            if #available(watchOS 10.0, *) {
                return AnyView(view.selectionDisabled(params.bool("value") ?? true))
            }
            return view
        }
    }
}
