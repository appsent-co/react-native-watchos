import SwiftUI

/// SwiftUI `.id(_:)`. Binds a stable identity to the view; changing the
/// value resets the view's lifetime. The JS `value` (string or number) is
/// coerced into a single Hashable string so the same input always yields
/// the same identity.
enum RNWIdModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("id") { view, params, _ in
            AnyView(view.id(RNWIdentityKey(raw: params["value"])))
        }
    }
}

/// Stable Hashable wrapping a JS-side `value` (string or number). Exact
/// bool/int parity doesn't matter — only that identical inputs hash alike.
private struct RNWIdentityKey: Hashable {
    let key: String

    init(raw: Any?) {
        switch raw {
        case let s as String:
            key = "s:" + s
        case let n as NSNumber:
            key = "n:" + n.stringValue
        case let other?:
            key = "x:" + String(describing: other)
        case .none:
            key = ""
        }
    }
}
