import SwiftUI

/// SwiftUI `.textCase(_:)`. Applies a case transform to text within the
/// view. `'uppercase'`/`'lowercase'` map to the matching `Text.Case`;
/// anything else (including an explicit `null`) passes `nil`, which clears
/// any inherited transform.
enum RNWTextCaseModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("textCase") { view, params, _ in
            let textCase: Text.Case?
            switch params.string("value") {
            case "uppercase": textCase = .uppercase
            case "lowercase": textCase = .lowercase
            default:          textCase = nil
            }
            return AnyView(view.textCase(textCase))
        }
    }
}
