import SwiftUI

/// SwiftUI `.help(_:)`. Attaches a short description used as the
/// accessibility hint. watchOS has no pointer, so the tooltip aspect is
/// effectively a no-op, but the modifier is available on watchOS 9+ and
/// the hint is honored by VoiceOver.
enum RNWHelpModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("help") { view, params, _ in
            guard let text = params.string("text") else { return view }
            return AnyView(view.help(text))
        }
    }
}
