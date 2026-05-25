import SwiftUI

/// SwiftUI `.scrollIndicators(_:)`. Sets the visibility of scroll
/// indicators within scrollable containers nested in this view.
/// Available watchOS 9+.
///
/// Note: `ScrollIndicatorVisibility` has a `never` case that the shared
/// `RNWVisibilityParser` (`Visibility`) doesn't model, so the mapping is
/// kept local here.
enum RNWScrollIndicatorsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollIndicators") { view, params, _ in
            AnyView(view.scrollIndicators(visibility(params.string("visibility"))))
        }
    }

    private static func visibility(_ s: String?) -> ScrollIndicatorVisibility {
        switch s {
        case "visible": return .visible
        case "hidden":  return .hidden
        case "never":   return .never
        default:        return .automatic
        }
    }
}
