import SwiftUI
import ReactNativeWatchOSCxx

enum RNWGridView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Grid") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment")) ?? .center
            let horizontalSpacing = snapshot.props?.cgFloat("horizontalSpacing")
            let verticalSpacing = snapshot.props?.cgFloat("verticalSpacing")
            return AnyView(
                Grid(
                    alignment: alignment,
                    horizontalSpacing: horizontalSpacing,
                    verticalSpacing: verticalSpacing
                ) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> Alignment? {
        switch s {
        case "leading":        return .leading
        case "trailing":       return .trailing
        case "center":         return .center
        case "top":            return .top
        case "bottom":         return .bottom
        case "topLeading":     return .topLeading
        case "topTrailing":    return .topTrailing
        case "bottomLeading":  return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        default:               return nil
        }
    }
}
