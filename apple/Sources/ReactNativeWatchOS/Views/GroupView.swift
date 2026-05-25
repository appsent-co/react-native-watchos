import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Group` — a transparent wrapper that lets a JS author apply
/// `modifiers={[…]}` to a logical set of siblings without introducing a
/// stack (which would change layout). Use the pre-rendered `children`
/// directly; `Group` simply forwards them.
enum RNWGroupView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Group") { _, children, _ in
            AnyView(Group { children })
        }
    }
}
