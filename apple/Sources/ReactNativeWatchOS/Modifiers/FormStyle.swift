import SwiftUI

/// SwiftUI `.formStyle(_:)`. watchOS ships only `AutomaticFormStyle`
/// (`.automatic`); `.columns` (macOS) and `.grouped` (iOS/macOS) are
/// unavailable on watchOS, so every value maps to `.automatic`. The `style`
/// param is accepted for cross-platform parity but has no other effect here.
enum RNWFormStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("formStyle") { view, _, _ in
            AnyView(view.formStyle(.automatic))
        }
    }
}
