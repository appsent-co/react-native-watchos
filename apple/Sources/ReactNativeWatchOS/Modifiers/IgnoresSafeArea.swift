import SwiftUI

/// SwiftUI `.ignoresSafeArea(_:edges:)`. Extends the view past the safe area
/// on the given `edges` (parsed by `RNWEdgeParser`, default `.all`), using
/// the default `.all` safe-area regions.
enum RNWIgnoresSafeAreaModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("ignoresSafeArea") { view, params, _ in
            // `RNWEdgeParser.edgeSet` already defaults a missing/nil value
            // to `.all`, matching the JS default.
            let edges = RNWEdgeParser.edgeSet(params["edges"])
            return AnyView(view.ignoresSafeArea(edges: edges))
        }
    }
}
