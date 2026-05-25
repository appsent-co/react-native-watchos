import SwiftUI

/// SwiftUI `.resizable()` — Image-only. Registered in the image-specific
/// registry so the typed `Image → Image` chain stays intact (otherwise
/// subsequent Image modifiers won't resolve after erasure).
enum RNWResizableModifier {
    @MainActor
    static func register(into r: RNWImageModifierRegistry) {
        r.register("resizable") { image, _ in
            image.resizable()
        }
    }
}
