import SwiftUI

/// SwiftUI `.buttonSizing(_:)` — controls whether a button hugs its title
/// (`.fitted`) or expands to fill available width (`.flexible`).
///
/// LIMITATION: `.buttonSizing(_:)` (and the `ButtonSizing` type) is only
/// available on watchOS 26+ SDKs, newer than this package's build floor
/// (watchOS 9). Referencing the symbol — even behind `#available` — would fail
/// to compile on the supported build SDKs, so this is a documented no-op: the
/// view is returned unchanged. There is no stable equivalent on watchOS 9.
/// Registering the `$type` keeps dispatch consistent and lets the no-op be
/// swapped for a real implementation once the SDK floor is raised.
enum RNWButtonSizingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("buttonSizing") { view, _, _ in view }
    }
}
