import SwiftUI

/// SwiftUI `.scrollTargetBehavior(_:)`. Sets the scroll snapping behavior
/// of the scrollable container: `.paging` snaps a page at a time,
/// `.viewAligned` snaps to views inside a `scrollTargetLayout()`.
///
/// Gated to watchOS 10+ (introduced alongside the scroll-target APIs).
/// Returns the view unchanged on older systems.
enum RNWScrollTargetBehaviorModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("scrollTargetBehavior") { view, params, _ in
            if #available(watchOS 10.0, *) {
                switch params.string("behavior") {
                case "paging":
                    return AnyView(view.scrollTargetBehavior(.paging))
                case "viewAligned":
                    return AnyView(view.scrollTargetBehavior(.viewAligned))
                default:
                    return view
                }
            }
            return view
        }
    }
}
