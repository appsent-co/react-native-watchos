import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `NavigationStack`. Pushes are declarative via `NavigationLink`
/// children in the JS tree — no JS-side stack or `path` binding in v1.
/// The system back gesture and back button are auto-provided by SwiftUI
/// on watchOS.
enum RNWNavigationStackView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("NavigationStack") { _, children, _ in
            AnyView(NavigationStack { children })
        }
    }
}
