import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Section`. Walks `snapshot.children` directly (instead of using
/// the pre-materialized `children: AnyView`) so it can route a child with
/// `viewName == "SectionHeader"` into the SwiftUI `header:` slot and one
/// with `viewName == "SectionFooter"` into `footer:`. Everything else
/// becomes a row in the section body. Either sentinel may be omitted.
enum RNWSectionView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Section") { snapshot, _, bus in
            var headerView: AnyView?
            var footerView: AnyView?
            var rows: [RNWShadowNodeSnapshot] = []
            for child in snapshot.viewChildren {
                switch child.viewName {
                case "SectionHeader":
                    headerView = RNWNodeRenderer.render(child, bus: bus)
                case "SectionFooter":
                    footerView = RNWNodeRenderer.render(child, bus: bus)
                default:
                    rows.append(child)
                }
            }

            let rowsView = AnyView(
                ForEach(rows, id: \.tag) { row in
                    RNWNodeRenderer.render(row, bus: bus)
                }
            )

            switch (headerView, footerView) {
            case let (.some(h), .some(f)):
                return AnyView(Section { rowsView } header: { h } footer: { f })
            case let (.some(h), .none):
                return AnyView(Section { rowsView } header: { h })
            case let (.none, .some(f)):
                return AnyView(Section { rowsView } footer: { f })
            case (.none, .none):
                return AnyView(Section { rowsView })
            }
        }
    }
}
