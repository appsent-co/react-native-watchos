import SwiftUI

/// SwiftUI `.colorInvert()`. Inverts every color in the view.
enum RNWColorInvertModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("colorInvert") { view, _, _ in
            AnyView(view.colorInvert())
        }
    }
}
