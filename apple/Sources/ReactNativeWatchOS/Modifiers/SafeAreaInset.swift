import SwiftUI

/// SwiftUI `.safeAreaInset(edge:alignment:spacing:content:)`. Reserves space
/// along an edge and places the slot `content` there, shrinking the main
/// content's safe area to fit. `top`/`bottom` use a `VerticalEdge` overload
/// (horizontal alignment); `leading`/`trailing` use a `HorizontalEdge`
/// overload (vertical alignment). Returns the view unchanged when no content
/// slot is provided.
enum RNWSafeAreaInsetModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("safeAreaInset") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            let spacing = params.cgFloat("spacing")
            switch params.string("edge") {
            case "bottom":
                return AnyView(view.safeAreaInset(
                    edge: .bottom,
                    alignment: RNWAlignmentParser.horizontal(
                        params.string("alignment")),
                    spacing: spacing
                ) { body })
            case "leading":
                return AnyView(view.safeAreaInset(
                    edge: .leading,
                    alignment: RNWAlignmentParser.vertical(
                        params.string("alignment")),
                    spacing: spacing
                ) { body })
            case "trailing":
                return AnyView(view.safeAreaInset(
                    edge: .trailing,
                    alignment: RNWAlignmentParser.vertical(
                        params.string("alignment")),
                    spacing: spacing
                ) { body })
            default: // "top"
                return AnyView(view.safeAreaInset(
                    edge: .top,
                    alignment: RNWAlignmentParser.horizontal(
                        params.string("alignment")),
                    spacing: spacing
                ) { body })
            }
        }
    }
}
