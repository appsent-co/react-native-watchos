import SwiftUI
import ReactNativeWatchOSCxx

enum RNWGeometryReaderView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        // TODO: geometry events are not yet bridged to JS. A follow-up
        // will surface `geo.size`/`geo.frame(in:)` via an
        // `onGeometryChange` event on this view.
        r.register("GeometryReader") { _, children, _ in
            AnyView(GeometryReader { _ in children })
        }
    }
}
