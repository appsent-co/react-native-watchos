import SwiftUI

/// SwiftUI `.labelsHidden()`. Hides the labels of controls (e.g. a `Toggle`,
/// `Picker`, or `Slider` title) while preserving them for accessibility.
///
/// Available on watchOS 6+, so no availability gate is needed.
enum RNWLabelsHiddenModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("labelsHidden") { view, _, _ in
            AnyView(view.labelsHidden())
        }
    }
}
