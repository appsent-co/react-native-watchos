import SwiftUI
import ReactNativeWatchOSCxx

/// Per-apply context giving modifiers access to JS callbacks (`fire`) and
/// content children (`content`). Modifier callbacks cross the bridge as
/// numeric handler ids (raw functions are dropped by the JSI → NS
/// converter); modifier content is hoisted into `__ModifierContent` child
/// nodes by the JS `useModifiers` hook.
@MainActor
public struct RNWModifierContext {
    public let bus: RNWEventBus
    public let node: RNWShadowNodeSnapshot

    public init(bus: RNWEventBus, node: RNWShadowNodeSnapshot) {
        self.bus = bus
        self.node = node
    }

    /// Nil handlerId is a no-op so callers can forward optionals:
    /// `ctx.fire(params.int("handler"))`.
    public func fire(_ handlerId: Int?, _ payload: Any? = nil) {
        guard let handlerId else { return }
        bus.fire(handlerId, payload: payload)
    }

    /// Nil when the slot is absent — callers fall back to `EmptyView()`
    /// or skip the wrapping modifier.
    public func content(_ slot: String?) -> AnyView? {
        guard let slot else { return nil }
        for child in node.children where child.viewName == "__ModifierContent" {
            if (child.props?["slot"] as? String) == slot {
                return RNWNodeRenderer.render(child, bus: bus)
            }
        }
        return nil
    }
}
