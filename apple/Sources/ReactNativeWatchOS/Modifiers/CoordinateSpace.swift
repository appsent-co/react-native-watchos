import SwiftUI

/// SwiftUI `.coordinateSpace(name:)`. Tags the view with a named coordinate
/// space. Uses the legacy `name:` overload (watchOS 6+) rather than the
/// `.named(_:)` form (watchOS 10+) so it works on the watchOS 9 floor. A
/// missing `name` leaves the view unchanged.
enum RNWCoordinateSpaceModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("coordinateSpace") { view, params, _ in
            guard let name = params.string("name") else { return view }
            return AnyView(view.coordinateSpace(name: name))
        }
    }
}
