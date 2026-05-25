import SwiftUI

/// Modifier applier shape. `ctx` exposes the event bus (callback
/// modifiers) and originating node (content modifiers — sheet/overlay).
public typealias RNWModifierApplier = (
    _ view: AnyView,
    _ params: [String: Any],
    _ ctx: RNWModifierContext
) -> AnyView

/// Generic SwiftUI modifier registry. Text-only modifiers live in
/// `RNWTextModifierRegistry` to preserve the `Text → Text` chain.
@MainActor
public final class RNWModifierRegistry {
    public static let shared = RNWModifierRegistry()
    private var appliers: [String: RNWModifierApplier] = [:]
    private init() {}

    public func register(_ type: String, applier: @escaping RNWModifierApplier) {
        appliers[type] = applier
    }

    /// Unknown `$type` returns the view unchanged (forward-compat with
    /// newer JS-side modifiers paired with an older native binary).
    public func apply(
        _ modifier: [String: Any],
        to view: AnyView,
        ctx: RNWModifierContext
    ) -> AnyView {
        guard let type = modifier["$type"] as? String,
              let applier = appliers[type] else { return view }
        return applier(view, modifier, ctx)
    }

    public func contains(_ type: String) -> Bool {
        appliers[type] != nil
    }
}
