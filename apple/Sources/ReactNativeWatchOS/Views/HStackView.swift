import SwiftUI
import ReactNativeWatchOSCxx

enum RNWHStackView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("HStack") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            let spacing = snapshot.props?.cgFloat("spacing")
            return AnyView(
                HStack(alignment: alignment, spacing: spacing) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> VerticalAlignment {
        switch s {
        case "top":                return .top
        case "bottom":             return .bottom
        case "firstTextBaseline":  return .firstTextBaseline
        case "lastTextBaseline":   return .lastTextBaseline
        default:                   return .center
        }
    }
}
