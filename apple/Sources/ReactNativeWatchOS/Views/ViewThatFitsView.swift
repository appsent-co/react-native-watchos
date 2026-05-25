import SwiftUI
import ReactNativeWatchOSCxx

enum RNWViewThatFitsView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ViewThatFits") { snapshot, children, _ in
            let axes = parseAxes(snapshot.props?.string("axes"))
            return AnyView(ViewThatFits(in: axes) { children })
        }
    }

    private static func parseAxes(_ s: String?) -> Axis.Set {
        switch s {
        case "horizontal": return .horizontal
        case "vertical":   return .vertical
        default:           return [.horizontal, .vertical]
        }
    }
}
