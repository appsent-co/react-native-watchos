import SwiftUI

/// SwiftUI `.listSectionSpacing(_:)` (watchOS 10+). A numeric `value`
/// maps to `.custom(_:)`; otherwise `spacing` selects `.compact` /
/// `.default`. No-op on watchOS 9 (returns the view unchanged).
enum RNWListSectionSpacingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("listSectionSpacing") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let spacing: ListSectionSpacing
                if let value = params.cgFloat("value") {
                    spacing = .custom(value)
                } else if params.string("spacing") == "compact" {
                    spacing = .compact
                } else {
                    spacing = .default
                }
                return AnyView(view.listSectionSpacing(spacing))
            }
            return view
        }
    }
}
