import SwiftUI

/// SwiftUI `.materialActiveAppearance(_:)` — watchOS 26 "Liquid Glass".
/// Forces a material/glass surface to render as active or inactive,
/// independent of whether its scene is key.
///
/// `appearance`: `automatic` (system decides), `active`, or `inactive`.
///
/// Gated to watchOS 26+ — returns the view unchanged on older OS.
enum RNWMaterialActiveAppearanceModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("materialActiveAppearance") { view, params, _ in
            guard #available(watchOS 26.0, *) else { return view }

            // `.inactive` is unavailable on watchOS; only `.active` and
            // `.automatic` exist here. "inactive" falls back to `.automatic`.
            let appearance: MaterialActiveAppearance
            switch params.string("appearance") {
            case "active":   appearance = .active
            default:         appearance = .automatic
            }
            return AnyView(view.materialActiveAppearance(appearance))
        }
    }
}
