import SwiftUI

/// SwiftUI `.matchedTransitionSource(id:in:)` (watchOS 11+ / iOS 17+).
///
/// LIMITATION (v1): the source/destination pairing needs a shared
/// `@Namespace`, which the bridge can't share across separate nodes. The
/// effect is applied with a *local* `@Namespace`, so it cannot match a
/// destination `navigationTransition(.zoom)` on another view. On
/// watchOS < 11 the modifier is a no-op (view passes through unchanged).
enum RNWMatchedTransitionSourceModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("matchedTransitionSource") { view, params, _ in
            guard let id = params.string("id") else { return view }
            if #available(watchOS 11.0, *) {
                return AnyView(view.modifier(LocalMatchedTransitionSource(id: id)))
            }
            return view
        }
    }
}

/// Applies `matchedTransitionSource` against a namespace local to this
/// modifier instance. See the limitation note above.
@available(watchOS 11.0, *)
private struct LocalMatchedTransitionSource: ViewModifier {
    let id: String
    @Namespace private var namespace

    func body(content: Content) -> some View {
        content.matchedTransitionSource(id: id, in: namespace)
    }
}
