import SwiftUI

/// SwiftUI `.searchable(text:prompt:)`.
///
/// LIMITATION: `.searchable` is declared `@available(watchOS, unavailable)`
/// in SwiftUI — there is NO search-field affordance on watchOS, and the
/// modifier cannot even be referenced when compiling for the watch (an
/// `#available` *runtime* check does not lift a platform-level
/// unavailability). There is therefore no valid watchOS form to fall back
/// to, so this applier is a documented no-op: it returns the view
/// unchanged and the `text` binding / `onChange` handler never fire.
///
/// The `$type` and JS surface (`text` mirror + `onChange`, modeled on the
/// other bind modifiers) are kept so callers can express intent and so this
/// applier can be upgraded in place if a future watchOS adds the API. The
/// handler id and text param are read here purely to document the intended
/// wiring; no SwiftUI search modifier is applied.
enum RNWSearchableModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("searchable") { view, _, _ in
            // `.searchable` is unavailable on watchOS — no-op (see doc above).
            view
        }
    }
}
