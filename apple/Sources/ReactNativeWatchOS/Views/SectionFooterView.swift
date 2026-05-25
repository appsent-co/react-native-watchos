import SwiftUI
import ReactNativeWatchOSCxx

/// Sentinel view consumed by `Section` — its presence as a direct child of
/// `<Section>` routes its contents into SwiftUI's `footer:` slot. When
/// rendered outside a `Section` (misuse), falls back to rendering its
/// children inline so the tree still produces something visible.
enum RNWSectionFooterView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("SectionFooter") { _, children, _ in
            AnyView(children)
        }
    }
}
