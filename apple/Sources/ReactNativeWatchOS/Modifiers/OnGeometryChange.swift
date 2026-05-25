import SwiftUI

/// SwiftUI `.onGeometryChange(for:of:action:)` (watchOS 11+ / iOS 16+),
/// observing the view's `size`. Fires the JS handler with
/// `{ width, height }` whenever the size changes. On watchOS < 11 this is a
/// no-op (view passes through unchanged, handler never fires).
enum RNWOnGeometryChangeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("onGeometryChange") { view, params, ctx in
            let handlerId = params.int("handler")
            if #available(watchOS 11.0, *) {
                return AnyView(view.onGeometryChange(for: CGSize.self) { proxy in
                    proxy.size
                } action: { size in
                    ctx.fire(handlerId, [
                        "width": size.width,
                        "height": size.height,
                    ])
                })
            }
            return view
        }
    }
}
