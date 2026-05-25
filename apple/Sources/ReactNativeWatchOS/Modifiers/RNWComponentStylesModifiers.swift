import SwiftUI

/// Aggregator for the "Component styles" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWComponentStylesModifiers {
    @MainActor
    static func registerAll() {
        RNWButtonStyleModifier.register(into: .shared)
        RNWToggleStyleModifier.register(into: .shared)
        RNWPickerStyleModifier.register(into: .shared)
        RNWDatePickerStyleModifier.register(into: .shared)
        RNWProgressViewStyleModifier.register(into: .shared)
        RNWGaugeStyleModifier.register(into: .shared)
        RNWTextFieldStyleModifier.register(into: .shared)
        RNWLabelStyleModifier.register(into: .shared)
        RNWLabeledContentStyleModifier.register(into: .shared)
        RNWFormStyleModifier.register(into: .shared)
        RNWTabViewStyleModifier.register(into: .shared)
        RNWControlSizeModifier.register(into: .shared)
    }
}
