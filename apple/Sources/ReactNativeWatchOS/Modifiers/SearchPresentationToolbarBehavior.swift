import SwiftUI

/// SwiftUI `.searchPresentationToolbarBehavior(_:)`.
///
/// LIMITATION: this modifier and its `SearchPresentationToolbarBehavior` type
/// are `unavailable` on watchOS — they exist only on iOS 17.0+ / macOS 14.0+.
/// There is no watchOS equivalent, so the applier is a documented no-op that
/// returns the view unchanged. Registered (rather than dropped) so the
/// `searchPresentationToolbarBehavior(...)` factory stays valid in
/// cross-platform JS and silently does nothing on the watch.
enum RNWSearchPresentationToolbarBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("searchPresentationToolbarBehavior") { view, _, _ in
            // No watchOS API — intentional no-op (see type-level note above).
            view
        }
    }
}
