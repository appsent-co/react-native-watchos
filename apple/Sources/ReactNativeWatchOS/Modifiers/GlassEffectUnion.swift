import SwiftUI

/// SwiftUI `.glassEffectUnion(id:namespace:)` — watchOS 26 "Liquid Glass".
/// Merges multiple glass elements that share an `id` (and namespace) into a
/// single continuous shape.
///
/// [LIMITED] The union is only meaningful when several sibling views share
/// one `Namespace.ID`. The bridge renders nodes independently and can't yet
/// share a single `@Namespace` across them, so we mint a *local* namespace
/// per applied view (via a `ViewModifier` struct that can host the property
/// wrapper) as a best effort. Real cross-view unions (multiple views melding
/// into one shape) are NOT bridged in v1.
///
/// Gated to watchOS 26+ — no-op on older OS.
enum RNWGlassEffectUnionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("glassEffectUnion") { view, params, _ in
            guard #available(watchOS 26.0, *) else { return view }
            guard let id = params.string("id") else { return view }
            return AnyView(view.modifier(GlassEffectUnionImpl(id: id)))
        }
    }
}

/// Hosts the local `@Namespace` required by `glassEffectUnion(id:namespace:)`.
@available(watchOS 26.0, *)
private struct GlassEffectUnionImpl: ViewModifier {
    let id: String
    @Namespace private var namespace

    func body(content: Content) -> some View {
        content.glassEffectUnion(id: id, namespace: namespace)
    }
}
