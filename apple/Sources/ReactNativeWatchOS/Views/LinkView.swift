import SwiftUI
import ReactNativeWatchOSCxx

enum RNWLinkView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Link") { snapshot, children, _ in
            guard
                let destinationString = snapshot.props?.string("destination"),
                let url = URL(string: destinationString)
            else {
                return AnyView(EmptyView())
            }
            if let title = snapshot.props?.string("title") {
                return AnyView(Link(title, destination: url))
            }
            return AnyView(Link(destination: url) { children })
        }
    }
}
