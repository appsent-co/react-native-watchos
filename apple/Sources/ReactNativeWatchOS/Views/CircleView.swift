import SwiftUI
import ReactNativeWatchOSCxx

enum RNWCircleView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Circle") { _, _, _ in
            AnyView(Circle())
        }
    }
}
