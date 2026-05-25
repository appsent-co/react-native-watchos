import SwiftUI

/// SwiftUI `.accessibilityValue(_:)`. Sets the spoken value of the view
/// (e.g. a control's current reading) for assistive technologies.
enum RNWAccessibilityValueModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityValue") { view, params, _ in
            AnyView(view.accessibilityValue(Text(params.string("value") ?? "")))
        }
    }
}
