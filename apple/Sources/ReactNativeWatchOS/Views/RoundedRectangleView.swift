import SwiftUI
import ReactNativeWatchOSCxx

enum RNWRoundedRectangleView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("RoundedRectangle") { snapshot, _, _ in
            let cornerRadius = snapshot.props?.cgFloat("cornerRadius") ?? 0
            let style: RoundedCornerStyle = snapshot.props?.string("style") == "circular"
                ? .circular
                : .continuous
            return AnyView(RoundedRectangle(cornerRadius: cornerRadius, style: style))
        }
    }
}
