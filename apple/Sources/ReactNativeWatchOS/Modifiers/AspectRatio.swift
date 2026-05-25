import SwiftUI

/// SwiftUI `.aspectRatio(_:contentMode:)`. Generic — works on Image,
/// containers, anything with intrinsic or stretchable dimensions.
enum RNWAspectRatioModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("aspectRatio") { view, params, _ in
            let mode = parseContentMode(params.string("contentMode"))
            if let ratio = params.double("ratio") {
                return AnyView(view.aspectRatio(ratio, contentMode: mode))
            }
            // No ratio → use the source's intrinsic ratio.
            return AnyView(view.aspectRatio(contentMode: mode))
        }
    }

    private static func parseContentMode(_ s: String?) -> ContentMode {
        s == "fill" ? .fill : .fit
    }
}
