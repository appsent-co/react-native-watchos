import SwiftUI

/// SwiftUI `.unredacted()`. Opts the subtree out of redaction applied by an
/// ancestor `.redacted(reason:)`, rendering its real content.
enum RNWUnredactedModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("unredacted") { view, _, _ in
            AnyView(view.unredacted())
        }
    }
}
