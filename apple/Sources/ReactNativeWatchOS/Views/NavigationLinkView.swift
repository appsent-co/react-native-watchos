import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `NavigationLink`. Walks `snapshot.children` to split out the
/// `NavigationLinkLabel` (always-visible row) from `NavigationLinkDestination`
/// (the pushed screen). The destination is rendered inside the
/// `NavigationLink`'s closure so SwiftUI defers evaluation until push —
/// but note: the destination subtree still lives in the React shadow tree
/// and gets re-committed on every JS render. Acceptable for v1.
enum RNWNavigationLinkView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("NavigationLink") { snapshot, _, bus in
            var labelView: AnyView?
            var destinationView: AnyView?
            for child in snapshot.children {
                switch child.viewName {
                case "NavigationLinkLabel":
                    labelView = RNWNodeRenderer.render(child, bus: bus)
                case "NavigationLinkDestination":
                    destinationView = RNWNodeRenderer.render(child, bus: bus)
                default:
                    // Untagged children are ignored. The expected shape is
                    // `<NavigationLink><Label/><Destination/></NavigationLink>`;
                    // anything else is a misuse, fall through silently.
                    break
                }
            }
            let label = labelView ?? AnyView(EmptyView())
            let destination = destinationView ?? AnyView(EmptyView())
            return AnyView(
                NavigationLink {
                    destination
                } label: {
                    label
                }
            )
        }
    }
}
