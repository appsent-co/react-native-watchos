import SwiftUI

/// SwiftUI `.searchToolbarBehavior(_:)`.
///
/// LIMITATION: this modifier and its `SearchToolbarBehavior` type are
/// `unavailable` on watchOS — they exist only on iOS 17.1+ / macOS 14.1+.
/// There is no watchOS equivalent, so the applier is a documented no-op that
/// returns the view unchanged. Registered (rather than dropped) so the
/// `searchToolbarBehavior(...)` factory stays valid in cross-platform JS and
/// silently does nothing on the watch instead of raising "unknown modifier".
enum RNWSearchToolbarBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("searchToolbarBehavior") { view, _, _ in
            // No watchOS API — intentional no-op (see type-level note above).
            view
        }
    }
}
