import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `.scrollPosition(id:)`. Two-way binds the scroll position to a
/// target id (pair with `scrollTargetLayout()` on the scrolled content).
/// JS owns the source of truth via `id`; we keep a local `@State` mirror
/// so the scroll position updates instantly, and report user-driven
/// changes back through the `handler` callback. The next snapshot from JS
/// converges the local state via `.onChange`.
///
/// Gated to watchOS 10+ — `scrollPosition(id:)` and the underlying
/// scroll-target machinery don't exist on watchOS 9, so the modifier
/// returns the view unchanged there.
enum RNWScrollPositionModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollPosition") { view, params, ctx in
            if #available(watchOS 10.0, *) {
                return AnyView(view.modifier(ScrollPositionMod(
                    remoteId: params.string("id"),
                    handlerId: params.int("handler"),
                    bus: ctx.bus
                )))
            }
            return view
        }
    }
}

/// Concrete `ViewModifier` holding the `@State` mirror. `RNWNodeRenderer`
/// stamps `.id(node.tag)` on the host node, which keeps this modifier's
/// `@State` stable across re-renders (same pattern as `ToggleView`).
@available(watchOS 10.0, *)
private struct ScrollPositionMod: ViewModifier {
    let remoteId: String?
    let handlerId: Int?
    let bus: RNWEventBus

    @State private var localId: String?

    init(remoteId: String?, handlerId: Int?, bus: RNWEventBus) {
        self.remoteId = remoteId
        self.handlerId = handlerId
        self.bus = bus
        _localId = State(initialValue: remoteId)
    }

    func body(content: Content) -> some View {
        content
            .scrollPosition(id: Binding(
                get: { localId },
                set: { newValue in
                    localId = newValue
                    if let handlerId {
                        // `newValue` is String? — payload survives the
                        // bridge as a String, or nil when scrolled to top.
                        bus.fire(handlerId, payload: newValue)
                    }
                }
            ))
            .onChange(of: remoteId) { newRemote in
                if newRemote != localId {
                    localId = newRemote
                }
            }
    }
}
