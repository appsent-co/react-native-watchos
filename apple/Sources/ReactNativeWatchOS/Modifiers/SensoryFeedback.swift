import SwiftUI

/// SwiftUI `.sensoryFeedback(_:trigger:)`. Plays haptic feedback whenever the
/// JS `trigger` value changes between renders. Requires watchOS 10 — on older
/// systems the view is returned unchanged.
///
/// The trigger is coerced to a stable `String` key (mirroring `Animation`'s
/// value key) so any bridged scalar — string or number — drives the
/// `Equatable` comparison SwiftUI uses to decide when to replay. Best-effort:
/// the feedback fires once per distinct trigger value.
///
/// `feedback`: `"success"` / `"warning"` / `"error"` / `"selection"` /
/// `"impact"`. Unrecognized values fall back to `.selection`.
enum RNWSensoryFeedbackModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("sensoryFeedback") { view, params, _ in
            guard #available(watchOS 10.0, *) else { return view }
            let feedback = Self.feedback(for: params.string("feedback"))
            let triggerKey = RNWSensoryTriggerKey(raw: params["trigger"])
            return AnyView(view.modifier(
                RNWSensoryFeedbackViewModifier(feedback: feedback, trigger: triggerKey)
            ))
        }
    }

    @available(watchOS 10.0, *)
    private static func feedback(for raw: String?) -> SensoryFeedback {
        switch raw {
        case "success":
            return .success
        case "warning":
            return .warning
        case "error":
            return .error
        case "impact":
            return .impact
        default:
            return .selection
        }
    }
}

/// Holds the resolved feedback + the current trigger key. SwiftUI replays the
/// feedback when `trigger` changes across renders.
@available(watchOS 10.0, *)
private struct RNWSensoryFeedbackViewModifier: ViewModifier {
    let feedback: SensoryFeedback
    let trigger: RNWSensoryTriggerKey

    func body(content: Content) -> some View {
        content.sensoryFeedback(feedback, trigger: trigger)
    }
}

/// Stable `Equatable`/`Hashable` wrapper over any bridged trigger scalar.
/// Identical inputs always produce identical keys, so SwiftUI fires the
/// feedback exactly when the JS value changes.
private struct RNWSensoryTriggerKey: Equatable, Hashable {
    let key: String

    init(raw: Any?) {
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
}
