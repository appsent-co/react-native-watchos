import SwiftUI

/// SwiftUI `.colorScheme(_:)`. Forces the subtree to render in the given
/// `ColorScheme`, overriding the inherited system appearance.
enum RNWColorSchemeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("colorScheme") { view, params, _ in
            guard let scheme = parse(params.string("value")) else { return view }
            return AnyView(view.colorScheme(scheme))
        }
    }

    static func parse(_ s: String?) -> ColorScheme? {
        switch s {
        case "light": return .light
        case "dark":  return .dark
        default:      return nil
        }
    }
}
