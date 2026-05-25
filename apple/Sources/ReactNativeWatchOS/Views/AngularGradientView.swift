import SwiftUI
import ReactNativeWatchOSCxx

enum RNWAngularGradientView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AngularGradient") { snapshot, _, _ in
            let colors = parseColors(snapshot.props?["colors"])
            let center = parseUnitPoint(snapshot.props?["center"]) ?? .center

            if let angle = snapshot.props?.double("angle") {
                return AnyView(
                    AngularGradient(
                        colors: colors,
                        center: center,
                        angle: .degrees(angle)
                    )
                )
            }
            if let start = snapshot.props?.double("startAngle"),
               let end = snapshot.props?.double("endAngle") {
                return AnyView(
                    AngularGradient(
                        colors: colors,
                        center: center,
                        startAngle: .degrees(start),
                        endAngle: .degrees(end)
                    )
                )
            }
            return AnyView(
                AngularGradient(
                    colors: colors,
                    center: center,
                    startAngle: .zero,
                    endAngle: .degrees(360)
                )
            )
        }
    }
}
