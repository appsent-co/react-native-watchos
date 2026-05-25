import SwiftUI

/// SwiftUI `.presentationDetents(_:)`.
///
/// LIMITATION: `presentationDetents` and the `PresentationDetent` type are
/// **iOS 16+ / macOS 13+ only — they do not exist on watchOS** (sheets are
/// always full-screen on watchOS, so there are no resting heights to
/// configure). The symbol cannot even be referenced on this platform, so
/// this modifier is registered as a no-op: it accepts the `detents` param
/// for cross-platform JS parity and returns the view unchanged.
enum RNWPresentationDetentsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("presentationDetents") { view, _, _ in
            // No-op on watchOS — `presentationDetents` is unavailable here.
            view
        }
    }
}
