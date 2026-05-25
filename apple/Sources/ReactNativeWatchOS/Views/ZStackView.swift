import SwiftUI
import ReactNativeWatchOSCxx

enum RNWZStackView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ZStack") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            return AnyView(
                ZStack(alignment: alignment) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> Alignment {
        switch s {
        case "leading":         return .leading
        case "trailing":        return .trailing
        case "top":             return .top
        case "bottom":          return .bottom
        case "topLeading":      return .topLeading
        case "topTrailing":     return .topTrailing
        case "bottomLeading":   return .bottomLeading
        case "bottomTrailing":  return .bottomTrailing
        default:                return .center
        }
    }
}
