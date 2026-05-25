import SwiftUI

/// SwiftUI `.progressViewStyle(_:)`. Maps the `style` string to a
/// progress-view style. Unknown values fall back to `.automatic`.
enum RNWProgressViewStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("progressViewStyle") { view, params, _ in
            switch params.string("style") {
            case "linear":
                return AnyView(view.progressViewStyle(.linear))
            case "circular":
                return AnyView(view.progressViewStyle(.circular))
            default:
                return AnyView(view.progressViewStyle(.automatic))
            }
        }
    }
}
