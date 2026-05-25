import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `DatePicker`. Same optimistic-binding pattern as `Toggle` /
/// `Slider`: JS owns the source of truth via `selection` (ISO-8601
/// string), but a local `@State` mirror lets the wheel react instantly
/// to user input without waiting for the JS round-trip. The next
/// snapshot from JS converges the local state via `.onChange(of:)`.
///
/// JSON has no `Date` type, so dates cross the bridge as ISO-8601
/// strings (parsed/serialized with `ISO8601DateFormatter`).
enum RNWDatePickerView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("DatePicker") { snapshot, _, bus in
            if #available(watchOS 10.0, *) {
                return AnyView(DatePickerImpl(snapshot: snapshot, bus: bus))
            } else {
                return AnyView(EmptyView())
            }
        }
    }
}

/// Shared formatter — `ISO8601DateFormatter` is thread-safe and
/// allocating one per render would churn under heavy interaction.
private let isoFormatter = ISO8601DateFormatter()

private func parseISO(_ s: String?) -> Date? {
    guard let s else { return nil }
    return isoFormatter.date(from: s)
}

@available(watchOS 10.0, *)
private struct DatePickerImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let bus: RNWEventBus

    @State private var localDate: Date

    init(snapshot: RNWShadowNodeSnapshot, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.bus = bus
        let initial = parseISO(snapshot.props?.string("selection")) ?? Date()
        _localDate = State(initialValue: initial)
    }

    var body: some View {
        let label = snapshot.props?.string("label") ?? ""
        let remote = parseISO(snapshot.props?.string("selection")) ?? localDate
        let components = parseComponents(snapshot.props?.string("displayedComponents"))
        let minimum = parseISO(snapshot.props?.string("minimum"))
        let maximum = parseISO(snapshot.props?.string("maximum"))
        let handlerId = snapshot.eventHandlers["onSelectionChange"]?.intValue

        let binding = Binding<Date>(
            get: { localDate },
            set: { newValue in
                localDate = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: isoFormatter.string(from: newValue))
                }
            }
        )

        return Group {
            if let minimum, let maximum {
                DatePicker(label, selection: binding, in: minimum...maximum, displayedComponents: components)
            } else {
                DatePicker(label, selection: binding, displayedComponents: components)
            }
        }
        .onChange(of: remote) { newRemote in
            if newRemote != localDate {
                localDate = newRemote
            }
        }
    }

    private func parseComponents(_ raw: String?) -> DatePickerComponents {
        switch raw {
        case "date":
            return .date
        case "hourAndMinute":
            return .hourAndMinute
        default:
            return [.date, .hourAndMinute]
        }
    }
}
