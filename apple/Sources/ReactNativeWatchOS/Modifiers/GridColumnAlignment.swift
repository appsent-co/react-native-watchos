import SwiftUI

/// SwiftUI `.gridColumnAlignment(_:)`. Sets the horizontal alignment for the
/// whole `Grid` column the modified cell sits in. Available on watchOS 9+.
enum RNWGridColumnAlignmentModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("gridColumnAlignment") { view, params, _ in
            let alignment = RNWAlignmentParser.horizontal(params.string("alignment"))
            return AnyView(view.gridColumnAlignment(alignment))
        }
    }
}
