import SwiftUI

/// SwiftUI `.contentMargins(_:_:for:)`. Adds margins around the content of
/// a scrollable view. `edges` is parsed via the shared `RNWEdgeParser`
/// (defaults to `.all`); `length` is the inset in points. Applied for the
/// `.scrollContent` placement so it insets scrollable content specifically.
///
/// Gated to watchOS 10+. Returns the view unchanged on older systems.
enum RNWContentMarginsModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("contentMargins") { view, params, _ in
            if #available(watchOS 10.0, *) {
                let edges = RNWEdgeParser.edgeSet(params["edges"])
                let length = params.cgFloat("length") ?? 0
                return AnyView(view.contentMargins(edges, length, for: .scrollContent))
            }
            return view
        }
    }
}
