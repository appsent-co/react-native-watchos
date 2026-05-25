import SwiftUI

/// SwiftUI `.gaugeStyle(_:)`. Maps the `style` string to a gauge style.
/// All listed styles are available on watchOS 9 (the deployment target),
/// so no availability gating is required. Unknown values fall back to
/// `.automatic`.
enum RNWGaugeStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gaugeStyle") { view, params, _ in
            switch params.string("style") {
            case "accessoryCircular":
                return AnyView(view.gaugeStyle(.accessoryCircular))
            case "accessoryCircularCapacity":
                return AnyView(view.gaugeStyle(.accessoryCircularCapacity))
            case "accessoryLinear":
                return AnyView(view.gaugeStyle(.accessoryLinear))
            case "accessoryLinearCapacity":
                return AnyView(view.gaugeStyle(.accessoryLinearCapacity))
            case "linearCapacity":
                return AnyView(view.gaugeStyle(.linearCapacity))
            default:
                return AnyView(view.gaugeStyle(.automatic))
            }
        }
    }
}
