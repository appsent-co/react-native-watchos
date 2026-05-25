import SwiftUI

/// SwiftUI `.lineLimit(_:)`. Caps the number of lines text within the view
/// can use before truncating. An absent `value` leaves the view unchanged.
enum RNWLineLimitModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("lineLimit") { view, params, _ in
            guard let limit = params.int("value") else { return view }
            return AnyView(view.lineLimit(limit))
        }
    }
}
