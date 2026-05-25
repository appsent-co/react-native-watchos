import SwiftUI

/// SwiftUI `.luminanceToAlpha()`. Maps luminance to an alpha mask —
/// bright areas become opaque, dark areas transparent.
enum RNWLuminanceToAlphaModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("luminanceToAlpha") { view, _, _ in
            AnyView(view.luminanceToAlpha())
        }
    }
}
