import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Button`. JS passes the press handler as a numeric id in
/// `eventHandlers["onPress"]`; we capture the event bus and fire that
/// id when the user taps. Children become the button's label content.
enum RNWButtonView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Button") { snapshot, children, bus in
            let handlerId = snapshot.eventHandlers["onPress"]?.intValue
            return AnyView(
                Button {
                    if let handlerId {
                        bus.fire(handlerId)
                    }
                } label: {
                    children
                }
            )
        }
    }
}
