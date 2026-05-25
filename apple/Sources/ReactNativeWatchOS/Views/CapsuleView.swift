import SwiftUI
import ReactNativeWatchOSCxx

enum RNWCapsuleView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Capsule") { _, _, _ in
            AnyView(Capsule())
        }
    }
}
