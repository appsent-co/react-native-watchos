import SwiftUI

/// SwiftUI `.minimumScaleFactor(_:)`. Lets text within the view shrink to
/// fit available space down to the given fraction of its font size. An
/// absent `value` leaves the view unchanged.
enum RNWMinimumScaleFactorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("minimumScaleFactor") { view, params, _ in
            guard let factor = params.double("value") else { return view }
            return AnyView(view.minimumScaleFactor(factor))
        }
    }
}
