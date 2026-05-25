import Foundation

/// Bridge for Swift → JS event dispatch. View builders capture an
/// `RNWEventBus` and invoke `fire(_:payload:)` from SwiftUI action
/// closures (`Button { bus.fire(id) }`, `Toggle(isOn: binding)`, …).
/// The injected dispatch closure is responsible for the main → JS-queue
/// hop; the bus itself is thread-agnostic.
public final class RNWEventBus: @unchecked Sendable {
    private let dispatch: (Int, Any?) -> Void

    public init(dispatch: @escaping (Int, Any?) -> Void) {
        self.dispatch = dispatch
    }

    public func fire(_ handlerId: Int, payload: Any? = nil) {
        dispatch(handlerId, payload)
    }

    public static let noop = RNWEventBus(dispatch: { _, _ in })
}
