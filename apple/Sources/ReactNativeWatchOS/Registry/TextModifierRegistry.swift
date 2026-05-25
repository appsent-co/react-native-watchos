import SwiftUI

/// `Text → Text` applier. Preserves SwiftUI's typed Text chain so
/// concatenation (`Text("a") + Text("b")`) and Text-only typographic
/// optimizations survive — erasing to AnyView throws all that away.
public typealias RNWTextModifierApplier = (
    _ text: Text,
    _ params: [String: Any]
) -> Text

@MainActor
public final class RNWTextModifierRegistry {
    public static let shared = RNWTextModifierRegistry()
    private var appliers: [String: RNWTextModifierApplier] = [:]
    private init() {}

    public func register(_ type: String, applier: @escaping RNWTextModifierApplier) {
        appliers[type] = applier
    }

    public func apply(_ modifier: [String: Any], to text: Text) -> Text {
        guard let type = modifier["$type"] as? String,
              let applier = appliers[type] else { return text }
        return applier(text, modifier)
    }

    public func contains(_ type: String) -> Bool {
        appliers[type] != nil
    }
}
