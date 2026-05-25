import SwiftUI

/// SwiftUI `.gridCellColumns(_:)`. Makes a view span multiple `Grid`
/// columns. Available on watchOS 9+.
enum RNWGridCellColumnsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gridCellColumns") { view, params, _ in
            let count = params.int("count") ?? 1
            return AnyView(view.gridCellColumns(count))
        }
    }
}
