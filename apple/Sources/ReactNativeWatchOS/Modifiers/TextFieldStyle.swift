import SwiftUI

/// SwiftUI `.textFieldStyle(_:)`. watchOS only ships `DefaultTextFieldStyle`
/// (`.automatic`); `.plain` and `.roundedBorder` are unavailable on watchOS,
/// so every value maps to `.automatic`. The `style` param is accepted for
/// cross-platform parity but has no other effect here.
enum RNWTextFieldStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("textFieldStyle") { view, _, _ in
            AnyView(view.textFieldStyle(.automatic))
        }
    }
}
