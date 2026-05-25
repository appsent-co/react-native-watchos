import SwiftUI
import ReactNativeWatchOSCxx

/// Sentinel view consumed by `NavigationLink` — its presence as a direct
/// child of `<NavigationLink>` routes its contents into SwiftUI's `label:`
/// slot (the always-visible tap target). When rendered outside a
/// `NavigationLink` (misuse), falls back to rendering its children inline.
enum RNWNavigationLinkLabelView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("NavigationLinkLabel") { _, children, _ in
            AnyView(children)
        }
    }
}
