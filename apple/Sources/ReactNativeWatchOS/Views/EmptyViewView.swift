import SwiftUI
import ReactNativeWatchOSCxx

enum RNWEmptyViewView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("EmptyView") { _, _, _ in
            AnyView(EmptyView())
        }
    }
}
