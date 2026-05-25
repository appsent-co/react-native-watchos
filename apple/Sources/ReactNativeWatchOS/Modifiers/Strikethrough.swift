import SwiftUI

/// SwiftUI `.strikethrough(_:color:)`. Applies a strikethrough to text
/// within the view. Defaults to active when `value` is omitted; an absent
/// or unrecognized `color` falls back to the text's foreground color (nil).
enum RNWStrikethroughModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("strikethrough") { view, params, _ in
            let isActive = params.bool("value") ?? true
            let color = params.string("color").flatMap(RNWColorParser.parse)
            return AnyView(view.strikethrough(isActive, color: color))
        }
    }
}
