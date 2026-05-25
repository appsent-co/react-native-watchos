import SwiftUI

/// SwiftUI `.navigationTitle(_:)`. Apply to a view inside a
/// `NavigationStack` — typically the screen's root container — to show
/// the string as the title at the top of the watchOS navigation bar.
enum RNWNavigationTitleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("navigationTitle") { view, params, _ in
            let title = params.string("text") ?? ""
            return AnyView(view.navigationTitle(title))
        }
    }
}
