import SwiftUI

/// SwiftUI `.animation(_:value:)`. The animation curve replays whenever
/// `value` changes between renders — JS passes a stable hashable key
/// (number / string / bool) and bumps it when an animation should fire.
///
/// `type` selects the curve; `duration` overrides the default duration
/// for curves that accept one. `type: "none"` passes `nil` to disable
/// animation for this segment (matches SwiftUI's nil-animation semantics).
enum RNWAnimationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("animation") { view, params, _ in
            let type = params.string("type") ?? "default"
            let duration = params.double("duration")
            let valueKey = AnimationValueKey(raw: params["value"])
            let animation = makeAnimation(type: type, duration: duration)
            return AnyView(view.animation(animation, value: valueKey))
        }
    }

    private static func makeAnimation(
        type: String, duration: Double?
    ) -> Animation? {
        switch type {
        case "none":
            return nil
        case "easeIn":
            return duration.map { .easeIn(duration: $0) } ?? .easeIn
        case "easeOut":
            return duration.map { .easeOut(duration: $0) } ?? .easeOut
        case "easeInOut":
            return duration.map { .easeInOut(duration: $0) } ?? .easeInOut
        case "linear":
            return duration.map { .linear(duration: $0) } ?? .linear
        case "spring":
            return .spring()
        default:
            return .default
        }
    }
}

/// Stable Hashable wrapping any JS-side `value`. SwiftUI compares this
/// across renders to decide whether to fire the animation. We coerce
/// the raw bridged value into a single string — exact bool/int parity
/// doesn't matter, only that the same input always hashes the same way.
private struct AnimationValueKey: Hashable {
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
