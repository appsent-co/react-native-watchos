import SwiftUI

/// SwiftUI `.renderingMode(_:)` — Image-only. `.template` recolours the
/// image with the current `foregroundStyle`; `.original` keeps source
/// colours. Passing `nil` (`"automatic"`) restores the system default.
enum RNWRenderingModeModifier {
    @MainActor
    static func register(into r: RNWImageModifierRegistry) {
        r.register("renderingMode") { image, params in
            switch params.string("mode") {
            case "template": return image.renderingMode(.template)
            case "original": return image.renderingMode(.original)
            default:         return image.renderingMode(nil)
            }
        }
    }
}
