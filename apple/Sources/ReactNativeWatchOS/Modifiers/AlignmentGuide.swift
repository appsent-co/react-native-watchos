import SwiftUI

/// SwiftUI `.alignmentGuide(_:computeValue:)`.
///
/// LIMITED: the real API takes an arbitrary `(ViewDimensions) -> CGFloat`
/// closure, which can't cross the JS bridge. This implements a simplified
/// form: a named `guide` plus a numeric `offset`, where `computeValue`
/// returns the guide's default value (`dimension[guide]`) plus the offset.
/// Custom guides and dimension-relative math are not expressible here.
enum RNWAlignmentGuideModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("alignmentGuide") { view, params, _ in
            let offset = params.cgFloat("offset") ?? 0
            switch params.string("guide") {
            case "leading":
                return AnyView(view.alignmentGuide(.leading) {
                    $0[.leading] + offset
                })
            case "trailing":
                return AnyView(view.alignmentGuide(.trailing) {
                    $0[.trailing] + offset
                })
            case "centerHorizontal":
                return AnyView(view.alignmentGuide(HorizontalAlignment.center) {
                    $0[HorizontalAlignment.center] + offset
                })
            case "top":
                return AnyView(view.alignmentGuide(.top) {
                    $0[.top] + offset
                })
            case "bottom":
                return AnyView(view.alignmentGuide(.bottom) {
                    $0[.bottom] + offset
                })
            case "centerVertical":
                return AnyView(view.alignmentGuide(VerticalAlignment.center) {
                    $0[VerticalAlignment.center] + offset
                })
            case "firstTextBaseline":
                return AnyView(view.alignmentGuide(.firstTextBaseline) {
                    $0[.firstTextBaseline] + offset
                })
            case "lastTextBaseline":
                return AnyView(view.alignmentGuide(.lastTextBaseline) {
                    $0[.lastTextBaseline] + offset
                })
            default:
                return view
            }
        }
    }
}
