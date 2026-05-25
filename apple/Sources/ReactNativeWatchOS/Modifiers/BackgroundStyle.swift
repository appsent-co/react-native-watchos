import SwiftUI

/// SwiftUI `.backgroundStyle(_:)` (watchOS 9+). Sets the default style for
/// the backgrounds of views within this view. Resolves the `style` string
/// through the shared `RNWShapeStyleParser`; leaves the view unchanged when
/// unrecognized.
enum RNWBackgroundStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("backgroundStyle") { view, params, _ in
            guard let style = RNWShapeStyleParser.parse(params.string("style")) else {
                return view
            }
            return AnyView(view.backgroundStyle(style))
        }
    }
}
