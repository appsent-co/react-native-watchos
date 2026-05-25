import SwiftUI

/// SwiftUI `.scrollBounceBehavior(_:axes:)`. Configures the bounce
/// behavior of scrollable views along the given axes.
///
/// `axes` is an `Axis.Set` (not `Edge.Set`), so it's parsed locally from
/// `'horizontal'`/`'vertical'` (string or array). Defaults to
/// `.vertical`, matching SwiftUI's default.
///
/// Gated to watchOS 10+. Returns the view unchanged on older systems.
enum RNWScrollBounceBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollBounceBehavior") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let axes = axisSet(params["axes"])
                switch params.string("behavior") {
                case "always":
                    return AnyView(view.scrollBounceBehavior(.always, axes: axes))
                case "basedOnSize":
                    return AnyView(view.scrollBounceBehavior(.basedOnSize, axes: axes))
                case "automatic":
                    return AnyView(view.scrollBounceBehavior(.automatic, axes: axes))
                default:
                    return view
                }
            }
            return view
        }
    }

    /// Parse an `Axis.Set` from a single axis name or an array of them.
    /// Defaults to `.vertical`.
    private static func axisSet(_ value: Any?) -> Axis.Set {
        if let s = value as? String { return single(s) }
        if let arr = value as? [Any] {
            var set: Axis.Set = []
            for item in arr {
                if let s = item as? String { set.insert(single(s)) }
            }
            return set.isEmpty ? .vertical : set
        }
        return .vertical
    }

    private static func single(_ s: String) -> Axis.Set {
        switch s {
        case "horizontal": return .horizontal
        case "vertical":   return .vertical
        default:           return .vertical
        }
    }
}
