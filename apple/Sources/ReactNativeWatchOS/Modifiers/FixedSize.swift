import SwiftUI

/// SwiftUI `.fixedSize()` / `.fixedSize(horizontal:vertical:)`. With neither
/// `horizontal` nor `vertical` param present, fixes the view at its ideal
/// size on both axes; otherwise fixes only the requested axes (a missing
/// axis param defaults to `false`).
enum RNWFixedSizeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("fixedSize") { view, params, _ in
            let h = params.bool("horizontal")
            let v = params.bool("vertical")
            if h == nil && v == nil {
                return AnyView(view.fixedSize())
            }
            return AnyView(view.fixedSize(
                horizontal: h ?? false,
                vertical: v ?? false
            ))
        }
    }
}
