import SwiftUI

/// SwiftUI `.defaultScrollAnchor(_:)`. Sets the unit point the scroll view
/// initially aligns to (and re-aligns to when content size changes).
/// `anchor` is parsed via the shared `parseUnitPoint` ('top' | 'center' |
/// 'bottom' | … | `{ x, y }`); defaults to `.center`.
///
/// Gated to watchOS 10+. Returns the view unchanged on older systems.
enum RNWDefaultScrollAnchorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("defaultScrollAnchor") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let anchor = parseUnitPoint(params["anchor"]) ?? .center
                return AnyView(view.defaultScrollAnchor(anchor))
            }
            return view
        }
    }
}
