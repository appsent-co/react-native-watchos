import SwiftUI

/// SwiftUI `.tabViewStyle(_:)`. Maps the `style` string to a tab-view
/// style. `.page` / `.carousel` are watchOS 7+ and `.verticalPage` is
/// watchOS 9+ — all available on the watchOS 9 deployment target, so no
/// availability gating is required. Unknown values fall back to
/// `.automatic`.
enum RNWTabViewStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("tabViewStyle") { view, params, _ in
            switch params.string("style") {
            case "page":
                return AnyView(view.tabViewStyle(.page))
            case "verticalPage":
                // `.verticalPage` is watchOS 10+; fall back to `.page` below.
                if #available(watchOS 10.0, *) {
                    return AnyView(view.tabViewStyle(.verticalPage))
                }
                return AnyView(view.tabViewStyle(.page))
            case "carousel":
                return AnyView(view.tabViewStyle(.carousel))
            default:
                return AnyView(view.tabViewStyle(.automatic))
            }
        }
    }
}
