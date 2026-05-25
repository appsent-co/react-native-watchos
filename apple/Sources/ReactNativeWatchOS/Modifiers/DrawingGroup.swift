import SwiftUI

/// SwiftUI `.drawingGroup(opaque:colorMode:)`. Flattens descendants into
/// a single offscreen Metal-rendered image.
enum RNWDrawingGroupModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("drawingGroup") { view, params, _ in
            AnyView(view.drawingGroup(opaque: params.bool("opaque") ?? false))
        }
    }
}
