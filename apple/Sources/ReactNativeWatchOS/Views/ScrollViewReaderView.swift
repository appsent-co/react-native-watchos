import SwiftUI
import ReactNativeWatchOSCxx

enum RNWScrollViewReaderView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        // TODO: the `ScrollViewProxy` is not yet bridged to JS. A follow-up
        // will pair this with an `id()` modifier and a turbomodule
        // `scrollTo` API so JS can drive `proxy.scrollTo(id)`.
        r.register("ScrollViewReader") { _, children, _ in
            AnyView(ScrollViewReader { _ in children })
        }
    }
}
