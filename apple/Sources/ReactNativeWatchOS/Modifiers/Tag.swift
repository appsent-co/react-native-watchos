import SwiftUI

/// SwiftUI `.tag(_:)`. Tags the view with a `String` value used by
/// selection-driven containers (`Picker`, `TabView`) to match the bound
/// selection. The bridge models tag/selection values as strings.
enum RNWTagModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("tag") { view, params, _ in
            AnyView(view.tag(params.string("value") ?? ""))
        }
    }
}
