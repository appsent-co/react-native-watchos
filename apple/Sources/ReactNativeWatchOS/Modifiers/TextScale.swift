import SwiftUI

/// SwiftUI `.textScale(_:)`. Scales text relative to the inherited font —
/// `'default'` (standard) or `'secondary'` (relatively smaller).
///
/// `Text.Scale` and the `textScale(_:)` modifier are watchOS 11.0+, so
/// this is gated with `#available`. On earlier versions the view is
/// returned unchanged (no-op).
enum RNWTextScaleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("textScale") { view, params, _ in
            guard #available(watchOS 11.0, *) else { return view }
            let scale: Text.Scale =
                params.string("value") == "secondary" ? .secondary : .default
            return AnyView(view.textScale(scale))
        }
    }
}
