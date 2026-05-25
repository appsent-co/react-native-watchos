import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Label("Title", systemImage: "star.fill")`. Leaf view with
/// two string props — `title` (text) and `systemImage` (SF Symbol name,
/// mirrors the `systemName` convention used by `RNWImageView`). Generic
/// modifiers (`.padding`, `.foregroundColor`, …) flow through the
/// renderer's reduce, so no per-view modifier handling is needed.
enum RNWLabelView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Label") { snapshot, _, _ in
            let title = snapshot.props?.string("title") ?? ""
            let systemImage = snapshot.props?.string("systemImage") ?? ""
            return AnyView(Label(title, systemImage: systemImage))
        }
    }
}
