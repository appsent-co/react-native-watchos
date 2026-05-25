import SwiftUI
import ReactNativeWatchOSCxx

enum RNWSpacerView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Spacer") { snapshot, _, _ in
            // Optional minimum length. Default is the system spacing.
            let minLength = snapshot.props?.cgFloat("minLength")
            return AnyView(Spacer(minLength: minLength))
        }
    }
}
