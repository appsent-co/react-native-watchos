import SwiftUI

/// SwiftUI `.handGestureShortcut(_:)`. Assigns a view to a system
/// hand-gesture shortcut (the Apple Watch double-tap / pinch gesture).
/// Requires watchOS 11 — on older systems the view is returned unchanged.
///
/// `shortcut`: `.primaryAction` is the only hand-gesture shortcut on
/// watchOS, so every value maps to it (`.counter` exists only on other
/// platforms). The `shortcut` param is accepted for parity.
enum RNWHandGestureShortcutModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("handGestureShortcut") { view, _, _ in
            guard #available(watchOS 11.0, *) else { return view }
            return AnyView(view.handGestureShortcut(.primaryAction))
        }
    }
}
