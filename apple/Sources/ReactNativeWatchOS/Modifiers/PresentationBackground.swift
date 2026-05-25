import SwiftUI

/// SwiftUI `.presentationBackground(_:)` / `.presentationBackground(_:){…}`.
///
/// LIMITATION: `presentationBackground` (both the shape-style and the
/// `content`-closure overloads) is **iOS 16.4+ / macOS 13.3+ / tvOS only —
/// not available on watchOS** (the symbol cannot be referenced here).
/// watchOS sheets always use the system background. This modifier is
/// registered as a no-op: it accepts the `style` / `content` params for
/// cross-platform JS parity and returns the view unchanged.
///
/// Were it available, the implementation would resolve `style` through
/// `RNWShapeStyleParser.parse(params.string("style"))` and the `content`
/// slot through `ctx.content(params.string("content"))`.
enum RNWPresentationBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("presentationBackground") { view, _, _ in
            // No-op on watchOS — `presentationBackground` is unavailable here.
            view
        }
    }
}
