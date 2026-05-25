import SwiftUI

/// SwiftUI `.hidden()`. Hides the view while keeping its layout footprint.
/// The optional `value` bool lets JS toggle this from a condition — when
/// `false` the view is returned unchanged (visible).
enum RNWHiddenModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("hidden") { view, params, _ in
            if params.bool("value") == false { return view }
            return AnyView(view.hidden())
        }
    }
}
