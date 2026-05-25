import SwiftUI
import ReactNativeWatchOSCxx

enum RNWRadialGradientView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("RadialGradient") { snapshot, _, _ in
            let colors = parseColors(snapshot.props?["colors"])
            let center = parseUnitPoint(snapshot.props?["center"]) ?? .center
            let startRadius = snapshot.props?.cgFloat("startRadius") ?? 0
            let endRadius = snapshot.props?.cgFloat("endRadius") ?? 100
            return AnyView(
                RadialGradient(
                    colors: colors,
                    center: center,
                    startRadius: startRadius,
                    endRadius: endRadius
                )
            )
        }
    }
}
