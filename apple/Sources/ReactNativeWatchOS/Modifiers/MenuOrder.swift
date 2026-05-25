import SwiftUI

/// SwiftUI `.menuOrder(_:)`. Controls the presentation order of items inside a
/// menu — e.g. whether the first declared item sits closest to the trigger.
///
/// Available on watchOS 9+, so no availability gate is needed.
enum RNWMenuOrderModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("menuOrder") { view, params, _ in
            // `.priority` is unavailable on watchOS; only `.fixed` and
            // `.automatic` exist here. "priority" falls back to `.automatic`.
            switch params.string("order") {
            case "fixed":    return AnyView(view.menuOrder(.fixed))
            default:         return AnyView(view.menuOrder(.automatic))
            }
        }
    }
}
