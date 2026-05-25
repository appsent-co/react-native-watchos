import SwiftUI

/// SwiftUI `.scrollContentBackground(_:)`. Controls whether the scroll
/// view's background is visible (e.g. hide a `List`/`Form` background to
/// reveal a custom one underneath). Available watchOS 9+.
enum RNWScrollContentBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollContentBackground") { view, params, _ in
            AnyView(view.scrollContentBackground(
                RNWVisibilityParser.parse(params.string("visibility"))
            ))
        }
    }
}
