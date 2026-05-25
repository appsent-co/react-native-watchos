import SwiftUI

/// SwiftUI `.scrollClipDisabled(_:)`. Controls whether a scrollable view
/// clips its content to its container bounds.
///
/// Gated to watchOS 10+. Returns the view unchanged on older systems.
enum RNWScrollClipDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollClipDisabled") { view, params, _ in
            if #available(watchOS 10.0, *) {
                return AnyView(view.scrollClipDisabled(params.bool("disabled") ?? true))
            }
            return view
        }
    }
}
