import SwiftUI

/// SwiftUI `.lineSpacing(_:)`. Sets the vertical distance between lines of
/// text within the view. An absent `value` leaves the view unchanged.
enum RNWLineSpacingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("lineSpacing") { view, params, _ in
            guard let spacing = params.cgFloat("value") else { return view }
            return AnyView(view.lineSpacing(spacing))
        }
    }
}
