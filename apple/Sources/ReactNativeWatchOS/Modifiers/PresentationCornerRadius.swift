import SwiftUI

/// SwiftUI `.presentationCornerRadius(_:)`.
///
/// LIMITATION: `presentationCornerRadius` is **iOS 16.4+ / macOS 13.3+
/// only — it is not available on watchOS** (the symbol cannot be
/// referenced here). watchOS sheets use the system presentation shape and
/// expose no corner-radius override, so this modifier is registered as a
/// no-op: it accepts the `radius` param for cross-platform JS parity and
/// returns the view unchanged.
enum RNWPresentationCornerRadiusModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("presentationCornerRadius") { view, _, _ in
            // No-op on watchOS — `presentationCornerRadius` is unavailable here.
            view
        }
    }
}
