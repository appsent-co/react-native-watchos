import SwiftUI

/// SwiftUI `.gridCellAnchor(_:)`. Positions a view within its `Grid` cell.
/// Accepts a named anchor or an explicit `{ x, y }` unit point. Available
/// on watchOS 9+.
enum RNWGridCellAnchorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gridCellAnchor") { view, params, _ in
            let anchor = unitPoint(params["anchor"]) ?? .center
            return AnyView(view.gridCellAnchor(anchor))
        }
    }

    /// Map a named anchor string or an `{ x, y }` dict to a `UnitPoint`.
    private static func unitPoint(_ raw: Any?) -> UnitPoint? {
        if let s = raw as? String {
            switch s {
            case "center":         return .center
            case "top":            return .top
            case "bottom":         return .bottom
            case "leading":        return .leading
            case "trailing":       return .trailing
            case "topLeading":     return .topLeading
            case "topTrailing":    return .topTrailing
            case "bottomLeading":  return .bottomLeading
            case "bottomTrailing": return .bottomTrailing
            default:               return nil
            }
        }
        if let dict = raw as? [String: Any] {
            let x = (dict["x"] as? NSNumber)?.doubleValue ?? 0
            let y = (dict["y"] as? NSNumber)?.doubleValue ?? 0
            return UnitPoint(x: x, y: y)
        }
        return nil
    }
}
