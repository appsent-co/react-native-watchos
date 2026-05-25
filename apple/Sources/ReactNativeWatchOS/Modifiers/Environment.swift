import SwiftUI

/// SwiftUI `.environment(_:_:)`, restricted to a bridgeable subset of
/// `EnvironmentValues` key paths.
///
/// LIMITED: SwiftUI's `.environment(_:_:)` is generic over arbitrary
/// `WritableKeyPath<EnvironmentValues, V>`, which cannot be reconstructed
/// from a JSON string. Only the hand-picked keys below — whose values are
/// expressible over the bridge — are supported. Unknown `key` values are a
/// documented no-op (the view is returned unchanged).
enum RNWEnvironmentModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("environment") { view, params, _ in
            guard let key = params.string("key") else { return view }
            switch key {
            case "locale":
                guard let identifier = params.string("value") else { return view }
                return AnyView(view.environment(\.locale, Locale(identifier: identifier)))

            case "layoutDirection":
                let direction: LayoutDirection =
                    params.string("value") == "rightToLeft" ? .rightToLeft : .leftToRight
                return AnyView(view.environment(\.layoutDirection, direction))

            case "lineSpacing":
                guard let spacing = params.cgFloat("value") else { return view }
                return AnyView(view.environment(\.lineSpacing, spacing))

            case "multilineTextAlignment":
                let alignment = RNWAlignmentParser.textAlignment(params.string("value"))
                return AnyView(view.environment(\.multilineTextAlignment, alignment))

            default:
                // Unknown / unbridgeable key — no-op.
                return view
            }
        }
    }
}
