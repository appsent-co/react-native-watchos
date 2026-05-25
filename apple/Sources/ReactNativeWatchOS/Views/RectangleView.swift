import SwiftUI
import ReactNativeWatchOSCxx

enum RNWRectangleView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Rectangle") { _, _, _ in
            AnyView(Rectangle())
        }
    }
}
