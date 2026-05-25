import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Gauge`. Stateless display view — reads `value` within
/// `minimum`...`maximum` and renders the platform gauge. The `label`
/// and optional `currentValueLabel` are flat string props (rather than
/// nested label children) since watchOS gauges treat them as captions,
/// not arbitrary content trees.
enum RNWGaugeView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Gauge") { snapshot, _, _ in
            let value = snapshot.props?.double("value") ?? 0
            let minimum = snapshot.props?.double("minimum") ?? 0
            let maximum = snapshot.props?.double("maximum") ?? 1
            let label = snapshot.props?.string("label") ?? ""
            let currentValueLabel = snapshot.props?.string("currentValueLabel")

            if let currentValueLabel {
                return AnyView(
                    Gauge(value: value, in: minimum...maximum) {
                        Text(label)
                    } currentValueLabel: {
                        Text(currentValueLabel)
                    }
                )
            }
            return AnyView(
                Gauge(value: value, in: minimum...maximum) {
                    Text(label)
                }
            )
        }
    }
}
