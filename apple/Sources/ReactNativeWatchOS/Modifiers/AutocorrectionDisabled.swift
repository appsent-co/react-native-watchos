import SwiftUI

/// SwiftUI `.autocorrectionDisabled(_:)`. Disables (or re-enables)
/// autocorrection for text entry. The `value` param defaults to `true`
/// (i.e. disabled) when absent, matching SwiftUI's no-arg overload.
enum RNWAutocorrectionDisabledModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("autocorrectionDisabled") { view, params, _ in
            let value = params.bool("value") ?? true
            return AnyView(view.autocorrectionDisabled(value))
        }
    }
}
