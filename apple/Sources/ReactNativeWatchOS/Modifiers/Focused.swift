import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `.focused(_:)` — a two-way focus binding. JS owns the focused
/// state via the `value` param; we hold a local `@FocusState` mirror so focus
/// reflects immediately when the system moves it (Digital Crown, taps), fire
/// the JS `handler` with the new boolean on change, then converge back to the
/// authoritative `value` from the next snapshot.
///
/// `@FocusState` / `.focused(_:)` are watchOS 8+, under the watchOS 9
/// deployment target, so no availability gate is needed.
enum RNWFocusedModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("focused") { view, params, ctx in
            AnyView(view.modifier(FocusedMod(
                value: params.bool("value") ?? false,
                handlerId: params.int("handler"),
                bus: ctx.bus
            )))
        }
    }
}

/// Concrete `ViewModifier` so we can hang `@FocusState` off it. The applier
/// re-creates it each render with the latest `value`; `@FocusState` persists
/// because the modified view's identity is stable (`.id(node.tag)` upstream).
private struct FocusedMod: ViewModifier {
    let value: Bool
    let handlerId: Int?
    let bus: RNWEventBus

    @FocusState private var focused: Bool

    func body(content: Content) -> some View {
        content
            .focused($focused)
            // Mirror the initial / updated JS value into the focus state.
            .onAppear { if focused != value { focused = value } }
            .onChange(of: value) { newValue in
                // JS pushed an authoritative value — converge.
                if focused != newValue { focused = newValue }
            }
            .onChange(of: focused) { newFocused in
                // System/user moved focus — notify JS, but only when it
                // diverges from what JS already holds (skip convergence echoes).
                if newFocused != value, let handlerId {
                    bus.fire(handlerId, payload: newFocused)
                }
            }
    }
}
