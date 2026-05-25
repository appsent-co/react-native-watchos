import SwiftUI

/// SwiftUI `.glassEffectID(_:in:)` — watchOS 26 "Liquid Glass".
///
/// [LIMITED] The real API associates a glass element with a `Namespace.ID`
/// shared across the views that should morph into one another. The bridge
/// renders each native node independently and can't yet thread a single
/// `@Namespace` through them, so we mint a *local* `@Namespace` per applied
/// view (via a `ViewModifier` struct that can host the property wrapper).
/// The `id` is honored within that view, but cross-view morph/union (which
/// requires a shared namespace) is NOT bridged in v1.
///
/// Gated to watchOS 26+ — no-op on older OS.
enum RNWGlassEffectIDModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("glassEffectID") { view, params, _ in
            guard #available(watchOS 26.0, *) else { return view }
            guard let id = params.string("id") else { return view }
            return AnyView(view.modifier(GlassEffectIDImpl(id: id)))
        }
    }
}

/// Hosts the local `@Namespace` required by `glassEffectID(_:in:)`.
@available(watchOS 26.0, *)
private struct GlassEffectIDImpl: ViewModifier {
    let id: String
    @Namespace private var namespace

    func body(content: Content) -> some View {
        content.glassEffectID(id, in: namespace)
    }
}
