import SwiftUI
import ReactNativeWatchOSCxx

enum RNWLazyVStackView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LazyVStack") { snapshot, children, _ in
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            let spacing = snapshot.props?.cgFloat("spacing")
            let pinned = parsePinnedViews(snapshot.props?["pinnedViews"] as? [Any])
            return AnyView(
                LazyVStack(alignment: alignment, spacing: spacing, pinnedViews: pinned) {
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

    private static func parsePinnedViews(_ raw: [Any]?) -> PinnedScrollableViews {
        guard let raw else { return .init() }
        var out: PinnedScrollableViews = .init()
        for case let s as String in raw {
            switch s {
            case "sectionHeaders": out.insert(.sectionHeaders)
            case "sectionFooters": out.insert(.sectionFooters)
            default: break
            }
        }
        return out
    }
}
