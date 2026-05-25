import SwiftUI

/// SwiftUI `.monospacedDigit()`. Keeps the default font but renders digits
/// with uniform (monospaced) width so numbers don't shift horizontally as
/// they change. Takes no parameters.
enum RNWMonospacedDigitModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("monospacedDigit") { view, _, _ in
            AnyView(view.monospacedDigit())
        }
    }
}
