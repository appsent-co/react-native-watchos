import SwiftUI

/// SwiftUI `.containerValue(_:_:)` (watchOS 11+).
///
/// LIMITATION — implemented as a no-op. `containerValue` writes into a
/// `ContainerValues` slot addressed by a static `WritableKeyPath` declared
/// in Swift (via `@Entry`). There is no general, type-safe way to resolve
/// such a key path from a runtime string arriving across the JS bridge, and
/// values custom containers read are bridge-opaque. The registration exists
/// so the `$type` is recognized (forward-compat) and the view passes through
/// unchanged rather than being dropped.
enum RNWContainerValueModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("containerValue") { view, _, _ in
            // No generic bridge for ContainerValues key paths — see note above.
            return view
        }
    }
}
