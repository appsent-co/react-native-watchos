import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `LabeledContent`. Walks `snapshot.children` directly so it can
/// route a child with `viewName == "LabeledContentLabel"` into the
/// `label:` slot and `viewName == "LabeledContentContent"` into the
/// `content:` slot. Anything else falls back into the content slot so the
/// tree still produces something visible.
enum RNWLabeledContentView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LabeledContent") { snapshot, _, bus in
            var labelView: AnyView?
            var contentChildren: [RNWShadowNodeSnapshot] = []
            for child in snapshot.viewChildren {
                if child.viewName == "LabeledContentLabel" {
                    labelView = RNWNodeRenderer.render(child, bus: bus)
                } else {
                    contentChildren.append(child)
                }
            }

            let contentView = AnyView(
                ForEach(contentChildren, id: \.tag) { node in
                    RNWNodeRenderer.render(node, bus: bus)
                }
            )

            if let label = labelView {
                return AnyView(LabeledContent { contentView } label: { label })
            }
            return AnyView(LabeledContent { contentView } label: { EmptyView() })
        }
    }
}

/// Sentinel child of `<LabeledContent>` — routes into SwiftUI's `label:` slot.
enum RNWLabeledContentLabelView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LabeledContentLabel") { _, children, _ in
            AnyView(children)
        }
    }
}

/// Sentinel child of `<LabeledContent>` — routes into SwiftUI's `content:` slot.
enum RNWLabeledContentContentView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LabeledContentContent") { _, children, _ in
            AnyView(children)
        }
    }
}
