import SwiftUI

/// SwiftUI `.environmentObject(_:)`.
///
/// UNSUPPORTED: `.environmentObject` injects a reference-type
/// `ObservableObject` into the environment for descendants to read via
/// `@EnvironmentObject`. A JS value can't be made into a Swift
/// `ObservableObject` — it has no `objectWillChange` publisher and no
/// native identity — and there are no JS-side observers to drive. Registered
/// as a no-op (returns the view unchanged) so the JS factory exists and
/// composes; callers should use concrete value modifiers (e.g. `environment`)
/// for cross-cutting state instead.
enum RNWEnvironmentObjectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("environmentObject") { view, _, _ in
            view
        }
    }
}
