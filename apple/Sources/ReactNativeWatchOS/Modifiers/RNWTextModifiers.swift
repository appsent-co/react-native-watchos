import SwiftUI

/// Aggregator for the "Text" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWTextModifiers {
    @MainActor
    static func registerAll() {
        RNWFontDesignModifier.register(into: .shared)
        RNWFontWeightModifier.register(into: .shared)
        RNWBoldModifier.register(into: .shared)
        RNWItalicModifier.register(into: .shared)
        RNWUnderlineModifier.register(into: .shared)
        RNWStrikethroughModifier.register(into: .shared)
        RNWLineLimitModifier.register(into: .shared)
        RNWLineSpacingModifier.register(into: .shared)
        RNWMultilineTextAlignmentModifier.register(into: .shared)
        RNWMinimumScaleFactorModifier.register(into: .shared)
        RNWTruncationModeModifier.register(into: .shared)
        RNWMonospacedModifier.register(into: .shared)
        RNWMonospacedDigitModifier.register(into: .shared)
        RNWTextCaseModifier.register(into: .shared)
    }
}
