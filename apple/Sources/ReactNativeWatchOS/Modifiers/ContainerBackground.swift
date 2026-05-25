import SwiftUI

/// SwiftUI `.containerBackground(_:for:)` / `.containerBackground(for:){…}`.
/// Sets the background of an enclosing container (navigation stack by
/// default). When a `content` slot is supplied it is used as the background
/// view; otherwise the `style` string is resolved via `RNWShapeStyleParser`.
/// Requires watchOS 10+; on watchOS 9 the view is returned unchanged.
enum RNWContainerBackgroundModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("containerBackground") { view, params, ctx in
            guard #available(watchOS 10.0, *) else { return view }
            let placement = parsePlacement(params.string("container"))

            // A `content` view slot takes precedence over a shape `style`.
            if let body = ctx.content(params.string("content")) {
                return AnyView(view.containerBackground(for: placement) { body })
            }
            if let style = RNWShapeStyleParser.parse(params.string("style")) {
                return AnyView(view.containerBackground(style, for: placement))
            }
            return view
        }
    }

    @available(watchOS 10.0, *)
    private static func parsePlacement(_ s: String?) -> ContainerBackgroundPlacement {
        switch s {
        case "tabView": return .tabView
        // `.widget` is WidgetKit-only (not in the watchOS SwiftUI SDK).
        default:        return .navigation
        }
    }
}
