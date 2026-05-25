import SwiftUI

/// SwiftUI `.foregroundColor(_:)`. Registered in the generic registry so
/// it works on every view — for plain Text we lose the typed
/// `Text → Text` chain (and Text concatenation with it), but the visual
/// result is identical and the simpler registry layout is worth it for
/// our scale.
enum RNWForegroundColorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("foregroundColor") { view, params, _ in
            guard let colorString = params.string("color"),
                  let color = RNWColorParser.parse(colorString) else {
                return view
            }
            return AnyView(view.foregroundColor(color))
        }
    }
}
