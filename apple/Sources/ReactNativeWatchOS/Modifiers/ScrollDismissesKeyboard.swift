import SwiftUI

/// SwiftUI `.scrollDismissesKeyboard(_:)`. Configures how a scroll view
/// dismisses the keyboard during interaction.
///
/// Gated to watchOS 10+: `ScrollDismissesKeyboardMode` is only reliably
/// constructible on watchOS 10+, so on watchOS 9 the view is returned
/// unchanged (the system default dismiss behavior still applies).
enum RNWScrollDismissesKeyboardModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollDismissesKeyboard") { view, params, _ in
            if #available(watchOS 10.0, *) {
                return AnyView(view.scrollDismissesKeyboard(mode(params.string("mode"))))
            }
            return view
        }
    }

    @available(watchOS 10.0, *)
    private static func mode(_ s: String?) -> ScrollDismissesKeyboardMode {
        switch s {
        case "immediately":   return .immediately
        case "interactively": return .interactively
        case "never":         return .never
        default:              return .automatic
        }
    }
}
