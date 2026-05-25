import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Toggle`. The on/off state is bound bidirectionally: the JS
/// side owns the source of truth via `value`, but we hold a local
/// `@State` mirror so the toggle animates instantly when the user taps
/// — without waiting for the JS round-trip. The next snapshot from JS
/// converges the local state via `.onChange`.
enum RNWToggleView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Toggle") { snapshot, children, bus in
            AnyView(ToggleImpl(snapshot: snapshot, children: children, bus: bus))
        }
    }
}

/// Concrete SwiftUI view — needed so we can hang `@State` off it.
/// `.id(node.tag)` in `RNWNodeRenderer` keeps this struct's identity
/// stable across re-renders, which is what makes `@State` persist.
private struct ToggleImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let children: AnyView
    let bus: RNWEventBus

    @State private var localValue: Bool

    init(snapshot: RNWShadowNodeSnapshot, children: AnyView, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.children = children
        self.bus = bus
        let initial = snapshot.props?.bool("value") ?? false
        _localValue = State(initialValue: initial)
    }

    var body: some View {
        let remote = snapshot.props?.bool("value") ?? false
        let handlerId = snapshot.eventHandlers["onChange"]?.intValue

        return Toggle(isOn: Binding(
            get: { localValue },
            set: { newValue in
                localValue = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        )) {
            children
        }
        .onChange(of: remote) { newRemote in
            // JS pushed an authoritative value — converge.
            if newRemote != localValue {
                localValue = newRemote
            }
        }
    }
}
