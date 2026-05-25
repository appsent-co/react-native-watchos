import SwiftUI
import ReactNativeWatchOSCxx

/// Recursive node → AnyView translator. Single source of truth used by
/// `RNWRootView` and container builders (via the pre-rendered `children`).
@MainActor
public enum RNWNodeRenderer {
    public static func render(
        _ node: RNWShadowNodeSnapshot,
        bus: RNWEventBus
    ) -> AnyView {
        // Standalone rawText shouldn't reach here — Text-like builders
        // consume rawText children directly.
        if node.kind == .rawText {
            return AnyView(EmptyView())
        }

        // `viewChildren` skips `__ModifierContent` — those are pulled on
        // demand by modifiers (sheet/overlay/…) via `ctx.content`.
        let renderedChildren = AnyView(
            ForEach(node.viewChildren, id: \.tag) { child in
                render(child, bus: bus)
            }
        )

        let builder = RNWViewRegistry.shared.builder(for: node.viewName)
            ?? RNWNodeRenderer.fallback

        let base = builder(node, renderedChildren, bus)

        let ctx = RNWModifierContext(bus: bus, node: node)
        let modified = node.modifiers.reduce(base) { acc, mod in
            guard let dict = mod as? [String: Any] else { return acc }
            return RNWModifierRegistry.shared.apply(dict, to: acc, ctx: ctx)
        }

        // AnyView erasure drops SwiftUI's structural identity tracking;
        // `.id(node.tag)` restores it. Without this, every commit tears
        // down @State, animations, and TextField focus.
        return AnyView(modified.id(node.tag))
    }

    /// Red marker in DEBUG, EmptyView in release — surfaces missing
    /// registrations during development.
    private static let fallback: RNWViewBuilder = { node, _, _ in
        #if DEBUG
        return AnyView(
            Text("?\(node.viewName ?? "<nil>")")
                .font(.caption2)
                .foregroundStyle(.red)
        )
        #else
        return AnyView(EmptyView())
        #endif
    }
}
