import SwiftUI
import ReactNativeWatchOSCxx

enum RNWLazyHGridView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LazyHGrid") { snapshot, children, _ in
            let rows = RNWLazyVGridView.parseGridItems(snapshot.props?["rows"] as? [Any])
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            let spacing = snapshot.props?.cgFloat("spacing")
            let pinned = RNWLazyVGridView.parsePinnedViews(
                snapshot.props?["pinnedViews"] as? [Any])
            return AnyView(
                LazyHGrid(
                    rows: rows,
                    alignment: alignment,
                    spacing: spacing,
                    pinnedViews: pinned
                ) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> VerticalAlignment {
        switch s {
        case "top":    return .top
        case "bottom": return .bottom
        default:       return .center
        }
    }
}
