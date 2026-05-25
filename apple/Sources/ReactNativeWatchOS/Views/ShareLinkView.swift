import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `ShareLink`. Constrained to `String` items for now — URLs and
/// plain text both round-trip as Strings. A `title` prop is a shortcut for
/// the `ShareLink("title", item: ...)` initializer; otherwise children
/// render as the label.
enum RNWShareLinkView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("ShareLink") { snapshot, children, _ in
            guard let item = snapshot.props?.string("item") else {
                return AnyView(EmptyView())
            }
            let subject = snapshot.props?.string("subject").map(Text.init)
            let message = snapshot.props?.string("message").map(Text.init)
            if let title = snapshot.props?.string("title") {
                return AnyView(ShareLink(title, item: item, subject: subject, message: message))
            }
            return AnyView(
                ShareLink(item: item, subject: subject, message: message) {
                    children
                }
            )
        }
    }
}
