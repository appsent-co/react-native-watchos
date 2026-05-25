import SwiftUI
import ReactNativeWatchOSCxx

func parseUnitPoint(_ raw: Any?) -> UnitPoint? {
    if let s = raw as? String {
        switch s {
        case "top": return .top
        case "bottom": return .bottom
        case "leading": return .leading
        case "trailing": return .trailing
        case "center": return .center
        case "topLeading": return .topLeading
        case "topTrailing": return .topTrailing
        case "bottomLeading": return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        default: return nil
        }
    }
    if let dict = raw as? [String: Any] {
        let x = (dict["x"] as? NSNumber)?.doubleValue ?? 0
        let y = (dict["y"] as? NSNumber)?.doubleValue ?? 0
        return UnitPoint(x: x, y: y)
    }
    return nil
}

func parseColors(_ raw: Any?) -> [Color] {
    guard let arr = raw as? [Any] else { return [] }
    return arr.compactMap { ($0 as? String).flatMap(RNWColorParser.parse) }
}

enum RNWLinearGradientView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LinearGradient") { snapshot, _, _ in
            let colors = parseColors(snapshot.props?["colors"])
            let start = parseUnitPoint(snapshot.props?["startPoint"]) ?? .top
            let end = parseUnitPoint(snapshot.props?["endPoint"]) ?? .bottom
            return AnyView(
                LinearGradient(colors: colors, startPoint: start, endPoint: end)
            )
        }
    }
}
