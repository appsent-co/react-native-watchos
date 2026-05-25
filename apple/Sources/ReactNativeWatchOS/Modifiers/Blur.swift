import SwiftUI

/// SwiftUI `.blur(radius:opaque:)`. Applies a Gaussian blur to the view.
enum RNWBlurModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("blur") { view, params, _ in
            AnyView(view.blur(
                radius: params.cgFloat("radius") ?? 0,
                opaque: params.bool("opaque") ?? false
            ))
        }
    }
}
