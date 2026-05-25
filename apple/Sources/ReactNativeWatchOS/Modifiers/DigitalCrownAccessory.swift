import SwiftUI

/// SwiftUI `.digitalCrownAccessory { … }`. Shows an accessory view next to the
/// Digital Crown while it's in use (e.g. a value readout). The accessory body
/// is passed as modifier content from JS and resolved through `ctx.content`;
/// when no content is provided the view is returned unchanged.
///
/// Available on watchOS 9, the deployment floor, so no availability gating is
/// required.
enum RNWDigitalCrownAccessoryModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("digitalCrownAccessory") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            return AnyView(view.digitalCrownAccessory { body })
        }
    }
}
