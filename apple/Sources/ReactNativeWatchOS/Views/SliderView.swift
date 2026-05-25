import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Slider`. Same optimistic-binding pattern as `Toggle` — local
/// `@State` mirrors the snapshot's `value`, gets updated immediately on
/// drag, fires the JS `onChange` callback with the new value, and
/// converges to the next snapshot via `.onChange(of:)`.
enum RNWSliderView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Slider") { snapshot, _, bus in
            AnyView(SliderImpl(snapshot: snapshot, bus: bus))
        }
    }
}

private struct SliderImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let bus: RNWEventBus

    @State private var localValue: Double

    init(snapshot: RNWShadowNodeSnapshot, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.bus = bus
        _localValue = State(
            initialValue: snapshot.props?.double("value") ?? 0)
    }

    var body: some View {
        let remote = snapshot.props?.double("value") ?? 0
        let min  = snapshot.props?.double("min")  ?? 0
        let max  = snapshot.props?.double("max")  ?? 1
        let step = snapshot.props?.double("step")
        let handlerId = snapshot.eventHandlers["onChange"]?.intValue

        let binding = Binding<Double>(
            get: { localValue },
            set: { newValue in
                localValue = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        )

        return Group {
            if let step {
                Slider(value: binding, in: min...max, step: step)
            } else {
                Slider(value: binding, in: min...max)
            }
        }
        .onChange(of: remote) { newRemote in
            if newRemote != localValue {
                localValue = newRemote
            }
        }
    }
}
