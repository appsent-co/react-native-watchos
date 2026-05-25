import SwiftUI

/// SwiftUI `.geometryGroup()`. Isolates the view's geometry from its
/// parent so child layout/transform changes animate as one unit.
/// Available on watchOS 10+; older systems return the view unchanged.
enum RNWGeometryGroupModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("geometryGroup") { view, _, _ in
            if #available(watchOS 10.0, *) {
                return AnyView(view.geometryGroup())
            }
            return view
        }
    }
}
