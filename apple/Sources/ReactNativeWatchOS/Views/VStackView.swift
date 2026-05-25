import SwiftUI
import ReactNativeWatchOSCxx

enum RNWVStackView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("VStack") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            let spacing = snapshot.props?.cgFloat("spacing")
            return AnyView(
                VStack(alignment: alignment, spacing: spacing) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> HorizontalAlignment {
        switch s {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }
}
