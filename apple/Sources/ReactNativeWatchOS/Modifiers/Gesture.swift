import SwiftUI

/// SwiftUI `.gesture(_:)`.
///
/// **Limited (v1):** a general SwiftUI `Gesture` (drag/magnify/rotate,
/// composed gestures, value payloads) cannot be expressed across the JS
/// bridge. Only `tap` (→ `TapGesture`) and `longPress` (→ `LongPressGesture`)
/// are supported. The JS `handler` id fires on the gesture's action
/// (`.onEnded` for tap; the action closure for long press).
enum RNWGestureModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gesture") { view, params, ctx in
            RNWGestureSupport.apply(.standard, to: view, params: params, ctx: ctx)
        }
    }
}

/// Shared gesture construction for `.gesture`, `.simultaneousGesture`, and
/// `.highPriorityGesture`. `TapGesture` and `LongPressGesture` are distinct
/// concrete types and watchOS 9 has no `AnyGesture`, so each combination of
/// (gesture type × attach kind) is applied in its own branch.
enum RNWGestureSupport {
    /// Which SwiftUI gesture-attachment modifier to use.
    enum Kind {
        case standard
        case simultaneous
        case highPriority
    }

    @MainActor
    static func apply(
        _ kind: Kind,
        to view: AnyView,
        params: [String: Any],
        ctx: RNWModifierContext
    ) -> AnyView {
        let handlerId = params.int("handler")
        switch params.string("type") {
        case "longPress":
            let duration = params.double("minimumDuration") ?? 0.5
            let g = LongPressGesture(minimumDuration: duration)
                .onEnded { _ in ctx.fire(handlerId) }
            return attach(kind, g, to: view)
        default: // "tap" and unknown both map to a tap gesture
            let count = params.int("count") ?? 1
            let g = TapGesture(count: max(1, count))
                .onEnded { ctx.fire(handlerId) }
            return attach(kind, g, to: view)
        }
    }

    @MainActor
    private static func attach<G: Gesture>(
        _ kind: Kind,
        _ gesture: G,
        to view: AnyView
    ) -> AnyView {
        switch kind {
        case .standard:
            return AnyView(view.gesture(gesture))
        case .simultaneous:
            return AnyView(view.simultaneousGesture(gesture))
        case .highPriority:
            return AnyView(view.highPriorityGesture(gesture))
        }
    }
}
