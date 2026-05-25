import SwiftUI
import ReactNativeWatchOSCxx

enum RNWGridRowView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("GridRow") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            return AnyView(
                GridRow(alignment: alignment) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> VerticalAlignment? {
        switch s {
        case "top":                return .top
        case "center":             return .center
        case "bottom":             return .bottom
        case "firstTextBaseline":  return .firstTextBaseline
        case "lastTextBaseline":   return .lastTextBaseline
        default:                   return nil
        }
    }
}
