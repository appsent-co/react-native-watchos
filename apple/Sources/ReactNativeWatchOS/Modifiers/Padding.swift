import SwiftUI

/// SwiftUI `.padding(_:)`. Per-edge values accumulate on top of `all` /
/// `horizontal` / `vertical` shortcuts — `{horizontal: 8, top: 12}` ⇒
/// leading=trailing=8, top=12, bottom=0.
enum RNWPaddingModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("padding") { view, params, _ in
            var insets = EdgeInsets()
            if let all = params.double("all") {
                insets = EdgeInsets(
                    top: all, leading: all, bottom: all, trailing: all)
            }
            if let h = params.double("horizontal") {
                insets.leading = h
                insets.trailing = h
            }
            if let v = params.double("vertical") {
                insets.top = v
                insets.bottom = v
            }
            if let t  = params.double("top")      { insets.top = t }
            if let b  = params.double("bottom")   { insets.bottom = b }
            if let l  = params.double("leading")  { insets.leading = l }
            if let tr = params.double("trailing") { insets.trailing = tr }
            return AnyView(view.padding(insets))
        }
    }
}
