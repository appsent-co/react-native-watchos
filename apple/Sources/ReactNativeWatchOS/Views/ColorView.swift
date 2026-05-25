import SwiftUI
import ReactNativeWatchOSCxx

enum RNWColorView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Color") { snapshot, _, _ in
            let opacity = snapshot.props?.double("opacity") ?? 1

            if let name = snapshot.props?.string("name"),
               let parsed = RNWColorParser.parse(name) {
                return AnyView(parsed.opacity(opacity))
            }
            if let r = snapshot.props?.double("red"),
               let g = snapshot.props?.double("green"),
               let b = snapshot.props?.double("blue") {
                return AnyView(Color(.sRGB, red: r, green: g, blue: b, opacity: opacity))
            }
            return AnyView(Color.clear)
        }
    }
}
