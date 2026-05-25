import SwiftUI

/// SwiftUI `.labelReservedIconWidth(_:)` — reserves a minimum leading width for
/// a `Label`'s icon so titles stay aligned across rows that lack an icon.
///
/// LIMITATION: this API is only available on watchOS 26+ SDKs, newer than this
/// package's build floor (watchOS 9). Referencing the symbol — even behind
/// `#available` — would fail to compile on the supported build SDKs, so this is
/// a documented no-op: the view is returned unchanged. Registering the `$type`
/// keeps dispatch consistent and lets the no-op be swapped for a real
/// implementation once the SDK floor is raised.
enum RNWLabelReservedIconWidthModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("labelReservedIconWidth") { view, _, _ in view }
    }
}
