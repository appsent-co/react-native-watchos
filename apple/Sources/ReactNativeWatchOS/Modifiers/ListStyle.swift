import SwiftUI

/// SwiftUI `.listStyle(_:)`. `carousel` and `elliptical` are the
/// watchOS-specific styles; `plain` / `automatic` map to the
/// cross-platform defaults. Unknown values fall back to `.automatic`.
enum RNWListStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("listStyle") { view, params, _ in
            switch params.string("style") {
            case "plain":      return AnyView(view.listStyle(.plain))
            case "carousel":   return AnyView(view.listStyle(.carousel))
            case "elliptical": return AnyView(view.listStyle(.elliptical))
            default:           return AnyView(view.listStyle(.automatic))
            }
        }
    }
}
