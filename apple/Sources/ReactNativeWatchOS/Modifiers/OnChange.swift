import SwiftUI

/// SwiftUI `.onChange(of:perform:)` (watchOS 7+ form). Value-driven: JS passes
/// the observed `value` (string / number / bool) on every render, and the
/// `handler` fires with the new value whenever it differs from the previous
/// render. Implemented as a `ViewModifier` so SwiftUI tracks the value across
/// commits via its own diffing.
enum RNWOnChangeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onChange") { view, params, ctx in
            AnyView(view.modifier(RNWOnChangeBridge(
                value: RNWOnChangeValue(raw: params["value"]),
                handlerId: params.int("handler"),
                bus: ctx.bus
            )))
        }
    }
}

/// Stable, comparable wrapper around the bridged JS value. `key` drives
/// SwiftUI's `onChange(of:)` equality; `raw` is forwarded to JS unchanged so
/// the handler receives the same primitive it observed.
struct RNWOnChangeValue: Equatable {
    let key: String
    let raw: Any?

    init(raw: Any?) {
        self.raw = raw
        switch raw {
        case .none:
            key = ""
        case let s as String:
            key = "s:" + s
        case let n as NSNumber:
            key = "n:" + n.stringValue
        case let other?:
            key = "x:" + String(describing: other)
        }
    }

    static func == (lhs: RNWOnChangeValue, rhs: RNWOnChangeValue) -> Bool {
        lhs.key == rhs.key
    }
}

/// Fires `handlerId` with the new raw value whenever `value` changes between
/// renders. `bus.fire` accepts String / NSNumber payloads as-is.
struct RNWOnChangeBridge: ViewModifier {
    let value: RNWOnChangeValue
    let handlerId: Int?
    let bus: RNWEventBus

    func body(content: Content) -> some View {
        content.onChange(of: value) { newValue in
            guard let handlerId else { return }
            bus.fire(handlerId, payload: newValue.raw)
        }
    }
}
