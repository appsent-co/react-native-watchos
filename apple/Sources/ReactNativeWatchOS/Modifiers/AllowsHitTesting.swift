import SwiftUI

/// SwiftUI `.allowsHitTesting(_:)`. When `false`, taps/gestures pass through
/// to whatever is behind the view. Defaults to `true` when the param is
/// missing or malformed.
enum RNWAllowsHitTestingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("allowsHitTesting") { view, params, _ in
            AnyView(view.allowsHitTesting(params.bool("value") ?? true))
        }
    }
}
