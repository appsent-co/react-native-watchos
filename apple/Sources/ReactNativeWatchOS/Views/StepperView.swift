import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Stepper`. Same optimistic-binding pattern as `Slider` and
/// `Toggle` — local `@State` mirrors the snapshot's `value`, gets bumped
/// immediately on tap, fires the JS `onChange` callback with the new
/// value, and converges to the next snapshot via `.onChange(of:)`.
enum RNWStepperView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Stepper") { snapshot, _, bus in
            AnyView(StepperImpl(snapshot: snapshot, bus: bus))
        }
    }
}

private struct StepperImpl: View {
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
        let label = snapshot.props?.string("label") ?? ""
        let minimum = snapshot.props?.double("minimum")
        let maximum = snapshot.props?.double("maximum")
        let step = snapshot.props?.double("step") ?? 1
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
            if let minimum, let maximum {
                Stepper(label, value: binding, in: minimum...maximum, step: step)
            } else {
                Stepper(label, value: binding, step: step)
            }
        }
        .onChange(of: remote) { newRemote in
            if newRemote != localValue {
                localValue = newRemote
            }
        }
    }
}
