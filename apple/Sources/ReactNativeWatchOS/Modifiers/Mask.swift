import SwiftUI

/// SwiftUI `.mask(alignment:_:)`. Masks the modified view using the alpha
/// channel of the modifier-content view(s). Resolves the content slot via
/// `ctx.content`; when absent, returns the view unchanged.
enum RNWMaskModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("mask") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else { return view }
            let alignment = RNWAlignmentParser.alignment(params.string("alignment"))
            return AnyView(view.mask(alignment: alignment) { body })
        }
    }
}
