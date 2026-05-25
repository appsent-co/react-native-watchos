import SwiftUI

/// SwiftUI `.underline(_:color:)`. Applies an underline to text within the
/// view. Defaults to active when `value` is omitted; an absent or
/// unrecognized `color` falls back to the text's foreground color (nil).
enum RNWUnderlineModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("underline") { view, params, _ in
            let isActive = params.bool("value") ?? true
            let color = params.string("color").flatMap(RNWColorParser.parse)
            return AnyView(view.underline(isActive, color: color))
        }
    }
}
