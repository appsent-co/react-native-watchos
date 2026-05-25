import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `.digitalCrownRotation(_:…)`. Binds the Digital Crown to a numeric
/// value. JS owns the source of truth via `value`; we hold a local `@State`
/// mirror so the crown tracks smoothly without waiting for the JS round-trip,
/// then converge on the next snapshot via `.onChange` (the same
/// optimistic-binding pattern as `ToggleView`).
///
/// When `from`/`through` are supplied the bounded overload is used (with an
/// optional `sensitivity`); otherwise the plain unbounded binding overload.
/// Both overloads exist on watchOS 9, the deployment floor, so no gating is
/// needed.
enum RNWDigitalCrownRotationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("digitalCrownRotation") { view, params, ctx in
            AnyView(view.modifier(RNWDigitalCrownRotationViewModifier(
                value: params.double("value") ?? 0,
                handlerId: params.int("handler"),
                from: params.double("from"),
                through: params.double("through"),
                sensitivity: params.string("sensitivity"),
                bus: ctx.bus
            )))
        }
    }
}

private struct RNWDigitalCrownRotationViewModifier: ViewModifier {
    let value: Double
    let handlerId: Int?
    let from: Double?
    let through: Double?
    let sensitivity: String?
    let bus: RNWEventBus

    @State private var localValue: Double

    init(
        value: Double,
        handlerId: Int?,
        from: Double?,
        through: Double?,
        sensitivity: String?,
        bus: RNWEventBus
    ) {
        self.value = value
        self.handlerId = handlerId
        self.from = from
        self.through = through
        self.sensitivity = sensitivity
        self.bus = bus
        _localValue = State(initialValue: value)
    }

    func body(content: Content) -> some View {
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
            if let from, let through {
                content.digitalCrownRotation(
                    binding,
                    from: from,
                    through: through,
                    sensitivity: Self.resolveSensitivity(sensitivity)
                )
            } else {
                content.digitalCrownRotation(binding)
            }
        }
        .onChange(of: value) { newRemote in
            // JS pushed an authoritative value — converge.
            if newRemote != localValue {
                localValue = newRemote
            }
        }
    }

    private static func resolveSensitivity(
        _ raw: String?
    ) -> DigitalCrownRotationalSensitivity {
        switch raw {
        case "low":
            return .low
        case "medium":
            return .medium
        default:
            return .high
        }
    }
}
