import SwiftUI

/// SwiftUI `.tracking(_:)`. Like `kerning`, but also adds spacing after
/// the final character; takes precedence over `kerning` when both are
/// set. Registered in the generic registry. Defaults to `0` when absent.
enum RNWTrackingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("tracking") { view, params, _ in
            AnyView(view.tracking(params.cgFloat("value") ?? 0))
        }
    }
}
