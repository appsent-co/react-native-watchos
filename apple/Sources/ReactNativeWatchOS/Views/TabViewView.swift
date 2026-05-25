import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `TabView`. JS controls selection via a string `tabTag` prop on
/// each child (any child can declare it — most apps wrap each tab in a
/// `VStack` with `tabTag="rooms"` / `tabTag="schedule"`). Selection is
/// optimistically bound locally so the page transitions immediately when
/// the user swipes, then converges to the next JS snapshot.
///
/// Children are iterated directly off `snapshot.children` (not the
/// pre-materialized `children: AnyView`) so we can apply `.tag(...)` per
/// child — SwiftUI's selection binding matches against those tags.
enum RNWTabViewView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("TabView") { snapshot, _, bus in
            AnyView(TabViewImpl(snapshot: snapshot, bus: bus))
        }
    }

    fileprivate static func resolveTag(
        for child: RNWShadowNodeSnapshot,
        fallbackIndex: Int
    ) -> String {
        child.props?.string("tabTag") ?? String(fallbackIndex)
    }
}

private struct TabViewImpl: View {
    let snapshot: RNWShadowNodeSnapshot
    let bus: RNWEventBus

    @State private var localSelection: String

    init(snapshot: RNWShadowNodeSnapshot, bus: RNWEventBus) {
        self.snapshot = snapshot
        self.bus = bus
        // Initial selection: prop > first child's resolved tag > empty.
        let initial: String
        if let s = snapshot.props?.string("selection") {
            initial = s
        } else if let first = snapshot.viewChildren.first {
            initial = RNWTabViewView.resolveTag(for: first, fallbackIndex: 0)
        } else {
            initial = ""
        }
        _localSelection = State(initialValue: initial)
    }

    var body: some View {
        let remote = snapshot.props?.string("selection")
        let style = snapshot.props?.string("style")
        let handlerId = snapshot.eventHandlers["onSelectionChange"]?.intValue

        let binding = Binding<String>(
            get: { localSelection },
            set: { newValue in
                localSelection = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        )

        let children = snapshot.viewChildren
        let tabView = TabView(selection: binding) {
            ForEach(Array(children.enumerated()), id: \.element.tag) { idx, child in
                RNWNodeRenderer.render(child, bus: bus)
                    .tag(RNWTabViewView.resolveTag(for: child, fallbackIndex: idx))
            }
        }

        return Group {
            switch style {
            case "automatic":
                tabView.tabViewStyle(.automatic)
            default:
                // watchOS default — `.page`. Also handles style == "page".
                tabView.tabViewStyle(.page)
            }
        }
        .onChange(of: remote) { newRemote in
            if let v = newRemote, v != localSelection {
                localSelection = v
            }
        }
    }
}
