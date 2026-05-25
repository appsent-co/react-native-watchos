import SwiftUI

/// SwiftUI `.toolbarTitleDisplayMode(_:)` (watchOS 10+). Controls how the
/// navigation title is displayed: `automatic`, `inline`, or `large`. Returns
/// the view unchanged on watchOS 9.
enum RNWToolbarTitleDisplayModeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbarTitleDisplayMode") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let mode: ToolbarTitleDisplayMode
                switch params.string("mode") {
                case "inline": mode = .inline
                case "large":  mode = .large
                default:       mode = .automatic
                }
                return AnyView(view.toolbarTitleDisplayMode(mode))
            }
            return view
        }
    }
}
