import SwiftUI

/// SwiftUI `.backgroundExtensionEffect()` — watchOS 26 "Liquid Glass".
/// Extends the view's content beneath adjacent Liquid Glass surfaces
/// (mirrored/blurred) so the glass samples the underlying color. Takes no
/// parameters.
///
/// Gated to watchOS 26+ — returns the view unchanged on older OS.
enum RNWBackgroundExtensionEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("backgroundExtensionEffect") { view, _, _ in
            guard #available(watchOS 26.0, *) else { return view }
            return AnyView(view.backgroundExtensionEffect())
        }
    }
}
