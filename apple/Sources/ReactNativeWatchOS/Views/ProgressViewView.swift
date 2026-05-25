import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `ProgressView`. With no `value` prop, renders the indeterminate
/// spinner. With `value` (and optional `total`, default 1), renders a
/// determinate bar / ring. `tint` lives as a prop rather than a generic
/// modifier because `foregroundColor` doesn't reliably reach SwiftUI's
/// progress accent.
enum RNWProgressViewView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ProgressView") { snapshot, _, _ in
            let value = snapshot.props?.double("value")
            let total = snapshot.props?.double("total") ?? 1
            let style = snapshot.props?.string("style")
            let tint = snapshot.props?.string("tint").flatMap(RNWColorParser.parse)

            let base: AnyView
            if let value {
                base = AnyView(ProgressView(value: value, total: total))
            } else {
                base = AnyView(ProgressView())
            }

            switch style {
            case "linear":
                if let tint {
                    return AnyView(base.progressViewStyle(LinearProgressViewStyle(tint: tint)))
                }
                return AnyView(base.progressViewStyle(.linear))
            case "circular":
                if let tint {
                    return AnyView(base.progressViewStyle(CircularProgressViewStyle(tint: tint)))
                }
                return AnyView(base.progressViewStyle(.circular))
            default:
                if let tint {
                    return AnyView(base.tint(tint))
                }
                return base
            }
        }
    }
}
