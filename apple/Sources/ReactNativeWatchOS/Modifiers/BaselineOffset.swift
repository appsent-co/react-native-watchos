import SwiftUI

/// SwiftUI `.baselineOffset(_:)`. Shifts text vertically relative to its
/// baseline, in points (positive raises, negative lowers). Registered in
/// the generic registry. Defaults to `0` when absent.
enum RNWBaselineOffsetModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("baselineOffset") { view, params, _ in
            AnyView(view.baselineOffset(params.cgFloat("value") ?? 0))
        }
    }
}
