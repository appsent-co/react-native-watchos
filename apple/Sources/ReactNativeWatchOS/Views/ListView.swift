import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `List`. Children render as rows; wrap a subset in `Section`
/// (with optional `SectionHeader` / `SectionFooter` sentinels) to group.
/// Default `.automatic` style lets SwiftUI pick the watchOS-appropriate
/// look (usually `.carousel`). Use `.plain` if rows need exact heights —
/// `.carousel` scales rows as they scroll, which fights `.frame(height:)`.
enum RNWListView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("List") { snapshot, children, _ in
            let style = snapshot.props?.string("style")
            let list = List { children }
            switch style {
            case "plain":
                return AnyView(list.listStyle(.plain))
            case "carousel":
                return AnyView(list.listStyle(.carousel))
            case "elliptical":
                return AnyView(list.listStyle(.elliptical))
            default:
                return AnyView(list.listStyle(.automatic))
            }
        }
    }
}
