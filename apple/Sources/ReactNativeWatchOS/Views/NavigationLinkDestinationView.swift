import SwiftUI
import ReactNativeWatchOSCxx

/// Sentinel view consumed by `NavigationLink` — routes its contents into
/// the pushed-screen slot. When rendered outside a `NavigationLink`
/// (misuse), falls back to rendering its children inline.
enum RNWNavigationLinkDestinationView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("NavigationLinkDestination") { _, children, _ in
            AnyView(children)
        }
    }
}
