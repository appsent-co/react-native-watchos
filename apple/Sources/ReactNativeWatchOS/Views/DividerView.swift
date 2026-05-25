import SwiftUI
import ReactNativeWatchOSCxx

enum RNWDividerView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Divider") { _, _, _ in
            AnyView(Divider())
        }
    }
}
