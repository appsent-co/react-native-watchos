import SwiftUI

/// SwiftUI `.kerning(_:)`. Sets the spacing between each character pair,
/// in points. Registered in the generic registry so it applies to Text
/// and any view with inheritable typography. Defaults to `0` when the
/// value is absent (SwiftUI's no-kerning default).
enum RNWKerningModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("kerning") { view, params, _ in
            AnyView(view.kerning(params.cgFloat("value") ?? 0))
        }
    }
}
