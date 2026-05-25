import SwiftUI

/// SwiftUI `.cornerRadius(_:)`. Clips the view to a rounded rectangle of the
/// given `radius`. The API is deprecated in newer SDKs (in favor of
/// `.clipShape(RoundedRectangle(...))`) but remains available on watchOS 9+.
enum RNWCornerRadiusModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("cornerRadius") { view, params, _ in
            let radius = params.cgFloat("radius") ?? 0
            return AnyView(view.cornerRadius(radius))
        }
    }
}
