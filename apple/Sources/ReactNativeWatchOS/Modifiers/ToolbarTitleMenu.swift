import SwiftUI

/// SwiftUI `.toolbarTitleMenu { … }` (watchOS 9+). Populates the menu shown
/// from the navigation title. The `content` slot is resolved via `ctx`; with
/// no content provided the view is returned unchanged.
enum RNWToolbarTitleMenuModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("toolbarTitleMenu") { view, params, ctx in
            guard let body = ctx.content(params.string("content")) else {
                return view
            }
            return AnyView(view.toolbarTitleMenu { body })
        }
    }
}
