import SwiftUI

/// SwiftUI `.presentationDragIndicator(_:)`. Sets the visibility of the
/// drag indicator on a sheet. `visibility` is parsed by
/// `RNWVisibilityParser` (automatic / visible / hidden).
///
/// This API is available on watchOS 9+, so it applies on every supported
/// deployment target — no `#available` fallback is needed.
enum RNWPresentationDragIndicatorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("presentationDragIndicator") { view, params, _ in
            let visibility = RNWVisibilityParser.parse(params.string("visibility"))
            return AnyView(view.presentationDragIndicator(visibility))
        }
    }
}
