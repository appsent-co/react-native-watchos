import SwiftUI

/// SwiftUI `.presentationCompactAdaptation(_:)`.
///
/// LIMITATION: `presentationCompactAdaptation` and the
/// `PresentationAdaptation` type are **iOS 16.4+ / macOS 13.3+ / tvOS
/// only — not available on watchOS** (watchOS has a single compact size
/// class with no adaptive presentation styles, and the symbol cannot be
/// referenced here). This modifier is registered as a no-op: it accepts
/// the `adaptation` param for cross-platform JS parity and returns the
/// view unchanged.
enum RNWPresentationCompactAdaptationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("presentationCompactAdaptation") { view, _, _ in
            // No-op on watchOS — `presentationCompactAdaptation` is unavailable.
            view
        }
    }
}
