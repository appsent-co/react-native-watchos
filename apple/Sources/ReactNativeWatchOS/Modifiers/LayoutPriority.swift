import SwiftUI

/// SwiftUI `.layoutPriority(_:)`. Raises or lowers how aggressively the view
/// claims space among its stack siblings. Defaults to `0`.
enum RNWLayoutPriorityModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("layoutPriority") { view, params, _ in
            AnyView(view.layoutPriority(params.double("value") ?? 0))
        }
    }
}
