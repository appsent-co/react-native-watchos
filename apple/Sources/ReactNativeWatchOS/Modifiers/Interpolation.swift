import SwiftUI

/// SwiftUI `.interpolation(_:)` — Image-only. Controls how the image is
/// resampled when drawn at a non-native size. `.none` gives crisp pixel
/// art; `.high` is the default-ish smooth fit.
enum RNWInterpolationModifier {
    @MainActor
    static func register(into r: RNWImageModifierRegistry) {
        r.register("interpolation") { image, params in
            switch params.string("level") {
            case "none":   return image.interpolation(.none)
            case "low":    return image.interpolation(.low)
            case "medium": return image.interpolation(.medium)
            case "high":   return image.interpolation(.high)
            default:       return image
            }
        }
    }
}
