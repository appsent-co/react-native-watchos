import SwiftUI

/// SwiftUI `.navigationBarBackButtonHidden(_:)`. Hides the automatic back
/// button on a view pushed inside a `NavigationStack`. Defaults to hiding
/// (`value` absent → true) to match the JS factory's default argument.
enum RNWNavigationBarBackButtonHiddenModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("navigationBarBackButtonHidden") { view, params, _ in
            let hidden = params.bool("value") ?? true
            return AnyView(view.navigationBarBackButtonHidden(hidden))
        }
    }
}
