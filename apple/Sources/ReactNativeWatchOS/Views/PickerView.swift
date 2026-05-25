import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Picker`. Options live as a prop array (not children) so the
/// JSON tree stays flat — each entry is `{value: String, label: String}`,
/// rendered as a `Text` tagged by its value. Selection follows the same
/// optimistic-binding pattern as `Toggle` / `TabView`: a local `@State`
/// mirror flips immediately on tap, fires the JS callback, and converges
/// to the next snapshot via `.onChange`.
enum RNWPickerView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Picker") { snapshot, _, bus in
            AnyView(PickerImpl(snapshot: snapshot, bus: bus))
        }
    }
}

private struct PickerImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let bus: RNWEventBus

    @State private var localSelection: String

    init(snapshot: RNWShadowNodeSnapshot, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.bus = bus
        _localSelection = State(
            initialValue: snapshot.props?.string("selection") ?? "")
    }

    var body: some View {
        let remote = snapshot.props?.string("selection")
        let label = snapshot.props?.string("label") ?? ""
        let options = decodeOptions(snapshot.props?["options"])
        let handlerId = snapshot.eventHandlers["onSelectionChange"]?.intValue

        let binding = Binding<String>(
            get: { localSelection },
            set: { newValue in
                localSelection = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        )

        return Picker(label, selection: binding) {
            ForEach(options, id: \.value) { option in
                Text(option.label).tag(option.value)
            }
        }
        .onChange(of: remote) { newRemote in
            if let v = newRemote, v != localSelection {
                localSelection = v
            }
        }
    }

    private func decodeOptions(_ raw: Any?) -> [(value: String, label: String)] {
        guard let array = raw as? [Any] else { return [] }
        return array.compactMap { entry in
            guard let dict = entry as? [String: Any],
                  let value = dict["value"] as? String else { return nil }
            let label = (dict["label"] as? String) ?? value
            return (value: value, label: label)
        }
    }
}
