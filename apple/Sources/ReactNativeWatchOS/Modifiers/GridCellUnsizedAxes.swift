import SwiftUI

/// SwiftUI `.gridCellUnsizedAxes(_:)`. Opts a cell out of the `Grid`'s
/// width/height sizing along the given axes. Available on watchOS 9+.
enum RNWGridCellUnsizedAxesModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gridCellUnsizedAxes") { view, params, _ in
            return AnyView(view.gridCellUnsizedAxes(axisSet(params.string("axes"))))
        }
    }

    private static func axisSet(_ s: String?) -> Axis.Set {
        switch s {
        case "horizontal": return .horizontal
        case "vertical":   return .vertical
        case "both":       return [.horizontal, .vertical]
        default:           return []
        }
    }
}
