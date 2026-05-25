import SwiftUI

/// Maps JS trait name(s) to a combined `AccessibilityTraits`. Owned by this
/// unit (kept here rather than in foundation parsers) and shared with
/// `RNWAccessibilityRemoveTraitsModifier`. Accepts a single string or an
/// array of strings; unknown names are skipped.
enum RNWAccessibilityTraitsParser {
    static func parse(_ value: Any?) -> AccessibilityTraits {
        var traits = AccessibilityTraits()
        if let s = value as? String {
            traits.insert(single(s))
        } else if let arr = value as? [Any] {
            for item in arr {
                if let s = item as? String { traits.insert(single(s)) }
            }
        }
        return traits
    }

    private static func single(_ s: String) -> AccessibilityTraits {
        switch s {
        case "isButton":               return .isButton
        case "isHeader":               return .isHeader
        case "isImage":                return .isImage
        case "isLink":                 return .isLink
        case "isSelected":             return .isSelected
        case "isSummaryElement":       return .isSummaryElement
        case "startsMediaSession":     return .startsMediaSession
        case "updatesFrequently":      return .updatesFrequently
        case "playsSound":             return .playsSound
        case "allowsDirectInteraction": return .allowsDirectInteraction
        default:                       return []
        }
    }
}

/// SwiftUI `.accessibilityAddTraits(_:)`. Adds one or more traits describing
/// the view's behaviour. `traits` is a single name or an array combined into
/// one `AccessibilityTraits`.
enum RNWAccessibilityAddTraitsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("accessibilityAddTraits") { view, params, _ in
            let traits = RNWAccessibilityTraitsParser.parse(params["traits"])
            return AnyView(view.accessibilityAddTraits(traits))
        }
    }
}
