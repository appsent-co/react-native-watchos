import SwiftUI

/// SwiftUI `.truncationMode(_:)`. Controls where text within the view is
/// truncated when it doesn't fit. Defaults to `.tail` (SwiftUI's default)
/// for an absent/unrecognized mode.
enum RNWTruncationModeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("truncationMode") { view, params, _ in
            let mode: Text.TruncationMode
            switch params.string("mode") {
            case "head":   mode = .head
            case "middle": mode = .middle
            default:       mode = .tail
            }
            return AnyView(view.truncationMode(mode))
        }
    }
}
