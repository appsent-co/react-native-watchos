import SwiftUI

/// SwiftUI `.listRowInsets(_:)`. Overrides the default per-row padding of a
/// `List` row. Omitted edges default to 0.
enum RNWListRowInsetsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("listRowInsets") { view, params, _ in
            let insets = EdgeInsets(
                top: params.double("top") ?? 0,
                leading: params.double("leading") ?? 0,
                bottom: params.double("bottom") ?? 0,
                trailing: params.double("trailing") ?? 0
            )
            return AnyView(view.listRowInsets(insets))
        }
    }
}
