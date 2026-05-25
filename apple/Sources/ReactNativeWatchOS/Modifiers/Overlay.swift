import SwiftUI

/// SwiftUI `.overlay(alignment:content:)`. Layers the modifier-content
/// view(s) in front of the modified view. Resolves the content slot via
/// `ctx.content`; when absent, returns the view unchanged.
enum RNWOverlayModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("overlay") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            let alignment = RNWAlignmentParser.alignment(params.string("alignment"))
            return AnyView(view.overlay(alignment: alignment) { body })
        }
    }
}
