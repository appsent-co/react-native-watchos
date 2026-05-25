import SwiftUI

/// SwiftUI `.scrollTargetLayout()`. Marks a layout container (e.g. the
/// `LazyVStack` inside a `ScrollView`) so its children act as scroll
/// targets for `scrollTargetBehavior(.viewAligned)` / `scrollPosition`.
///
/// Gated to watchOS 10+. Returns the view unchanged on older systems.
enum RNWScrollTargetLayoutModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollTargetLayout") { view, _, _ in
            if #available(watchOS 10.0, *) {
                return AnyView(view.scrollTargetLayout())
            }
            return view
        }
    }
}
