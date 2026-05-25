import SwiftUI
import ReactNativeWatchOSCxx

enum RNWEllipseView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Ellipse") { _, _, _ in
            AnyView(Ellipse())
        }
    }
}
