import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `ContentUnavailableView` (watchOS 10+). Default variant walks
/// `snapshot.children` for sentinel slots and routes them into the
/// `label:` / `description:` / `actions:` closures (Section-style). The
/// `search` variant uses the system-provided empty-search-results preset
/// (`.search` or `.search(text:)`) and ignores children.
///
/// SwiftUI requires the `label:` closure to produce something, so an
/// absent label slot falls back to an empty `Text` rather than EmptyView.
enum RNWContentUnavailableView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ContentUnavailableView") { snapshot, _, bus in
            if #available(watchOS 10.0, *) {
                let variant = snapshot.props?.string("variant") ?? "default"
                if variant == "search" {
                    if let text = snapshot.props?.string("searchText") {
                        return AnyView(ContentUnavailableView.search(text: text))
                    }
                    return AnyView(ContentUnavailableView.search)
                }

                var labelView: AnyView?
                var descriptionView: AnyView?
                var actionsView: AnyView?
                for child in snapshot.children {
                    switch child.viewName {
                    case "ContentUnavailableLabel":
                        labelView = RNWNodeRenderer.render(child, bus: bus)
                    case "ContentUnavailableDescription":
                        descriptionView = RNWNodeRenderer.render(child, bus: bus)
                    case "ContentUnavailableActions":
                        actionsView = RNWNodeRenderer.render(child, bus: bus)
                    default:
                        break
                    }
                }

                let label = labelView ?? AnyView(Text(""))
                let description = descriptionView ?? AnyView(EmptyView())
                let actions = actionsView ?? AnyView(EmptyView())
                return AnyView(
                    ContentUnavailableView {
                        label
                    } description: {
                        description
                    } actions: {
                        actions
                    }
                )
            }
            return AnyView(EmptyView())
        }
    }
}

/// Sentinel — routed into `ContentUnavailableView`'s `label:` slot.
enum RNWContentUnavailableLabelView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ContentUnavailableLabel") { _, children, _ in
            AnyView(children)
        }
    }
}

/// Sentinel — routed into `ContentUnavailableView`'s `description:` slot.
enum RNWContentUnavailableDescriptionView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ContentUnavailableDescription") { _, children, _ in
            AnyView(children)
        }
    }
}

/// Sentinel — routed into `ContentUnavailableView`'s `actions:` slot.
enum RNWContentUnavailableActionsView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ContentUnavailableActions") { _, children, _ in
            AnyView(children)
        }
    }
}
