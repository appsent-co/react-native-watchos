import SwiftUI
import ReactNativeWatchOSCxx

enum RNWScrollViewView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ScrollView") { snapshot, children, _ in
            let axes = parseAxes(snapshot.props?.string("axes"))
            let showsIndicators = snapshot.props?.bool("showsIndicators") ?? true
            return AnyView(
                ScrollView(axes, showsIndicators: showsIndicators) {
                    children
                }
            )
        }
    }

    private static func parseAxes(_ s: String?) -> Axis.Set {
        switch s {
        case "horizontal": return .horizontal
        case "both":       return [.horizontal, .vertical]
        default:           return .vertical
        }
    }
}
