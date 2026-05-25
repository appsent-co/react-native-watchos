import SwiftUI

/// SwiftUI `.labelsVisibility(_:)` — the visibility-driven successor to
/// `.labelsHidden()`.
///
/// LIMITATION: `.labelsVisibility(_:)` is only available on watchOS 11+ SDKs,
/// which is newer than this package's build floor (watchOS 9). Referencing the
/// symbol — even behind `#available` — would fail to compile on the supported
/// build SDKs, so this is a documented no-op: the view is returned unchanged.
/// Use `labelsHidden` to hide control labels today. Registering the `$type`
/// keeps dispatch consistent and lets the no-op be swapped for a real
/// implementation once the SDK floor is raised.
enum RNWLabelsVisibilityModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("labelsVisibility") { view, _, _ in view }
    }
}
