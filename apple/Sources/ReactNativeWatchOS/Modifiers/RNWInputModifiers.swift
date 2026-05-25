import SwiftUI

/// Aggregator for the "Input" modifier unit — focus, keyboard, and
/// text-entry behavior. Each modifier registers itself from `registerAll()`
/// so `RNWRootView` wires the whole unit with a single call.
enum RNWInputModifiers {
    @MainActor
    static func registerAll() {
        RNWFocusableModifier.register(into: .shared)
        RNWSubmitLabelModifier.register(into: .shared)
        RNWAutocorrectionDisabledModifier.register(into: .shared)
        RNWTextContentTypeModifier.register(into: .shared)
        RNWTextInputAutocapitalizationModifier.register(into: .shared)
        RNWFocusedModifier.register(into: .shared)
    }
}
