import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `TextField`. Same optimistic-binding pattern as `Toggle` — a
/// local `@State` mirror updates instantly while the user types, fires
/// the JS `onChange` callback with the new text, and converges to the
/// next snapshot via `.onChange(of:)` when JS pushes an authoritative
/// value.
enum RNWTextFieldView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("TextField") { snapshot, _, bus in
            AnyView(TextFieldImpl(snapshot: snapshot, bus: bus))
        }
    }
}

private struct TextFieldImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let bus: RNWEventBus

    @State private var localText: String

    init(snapshot: RNWShadowNodeSnapshot, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.bus = bus
        _localText = State(initialValue: snapshot.props?.string("value") ?? "")
    }

    var body: some View {
        let remote = snapshot.props?.string("value") ?? ""
        let placeholder = snapshot.props?.string("placeholder") ?? ""
        let handlerId = snapshot.eventHandlers["onChange"]?.intValue

        return TextField(placeholder, text: Binding(
            get: { localText },
            set: { newValue in
                localText = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        ))
        .onChange(of: remote) { newRemote in
            if newRemote != localText {
                localText = newRemote
            }
        }
    }
}
