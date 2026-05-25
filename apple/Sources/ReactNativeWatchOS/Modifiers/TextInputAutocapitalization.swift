import SwiftUI

/// SwiftUI `.textInputAutocapitalization(_:)`. Controls how text entry
/// auto-capitalizes. `TextInputAutocapitalization` and this modifier are
/// watchOS 9+, which equals the deployment target, so no availability gate is
/// required. An unrecognized `value` leaves the view unchanged.
enum RNWTextInputAutocapitalizationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("textInputAutocapitalization") { view, params, _ in
            guard let value = parse(params.string("value")) else { return view }
            return AnyView(view.textInputAutocapitalization(value))
        }
    }

    private static func parse(_ s: String?) -> TextInputAutocapitalization? {
        switch s {
        case "never":      return .never
        case "words":      return .words
        case "sentences":  return .sentences
        case "characters": return .characters
        default:           return nil
        }
    }
}
