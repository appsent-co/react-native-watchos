import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `SecureField`. Same optimistic-binding pattern as `TextField`
/// — local `@State` mirror, fires JS `onChange` on edits, converges via
/// `.onChange(of:)` when JS pushes an authoritative value. The masking
/// (dots instead of glyphs) is SwiftUI's responsibility.
enum RNWSecureFieldView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("SecureField") { snapshot, _, bus in
            AnyView(SecureFieldImpl(snapshot: snapshot, bus: bus))
        }
    }
}

private struct SecureFieldImpl: View {
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

        return SecureField(placeholder, text: Binding(
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
