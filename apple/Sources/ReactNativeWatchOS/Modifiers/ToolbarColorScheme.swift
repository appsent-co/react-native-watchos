import SwiftUI

/// SwiftUI `.toolbarColorScheme(_:for:)` (watchOS 10+). Forces a `ColorScheme`
/// on the navigation bar; a missing/`null` `colorScheme` passes `nil` to clear
/// the override. Returns the view unchanged on watchOS 9.
enum RNWToolbarColorSchemeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbarColorScheme") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let scheme: ColorScheme?
                switch params.string("colorScheme") {
                case "light": scheme = .light
                case "dark":  scheme = .dark
                default:      scheme = nil
                }
                return AnyView(view.toolbarColorScheme(
                    scheme,
                    for: RNWToolbarPlacement.parse(params.string("bars"))
                ))
            }
            return view
        }
    }
}
