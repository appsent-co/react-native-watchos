import SwiftUI

/// SwiftUI `.antialiased(_:)` — Image-only. Turns on edge smoothing
/// when the image is drawn rotated, scaled, or otherwise off-grid.
enum RNWAntialiasedModifier {
    @MainActor
    static func register(into r: RNWImageModifierRegistry) {
        r.register("antialiased") { image, params in
            image.antialiased(params.bool("value") ?? true)
        }
    }
}
