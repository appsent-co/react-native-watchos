import SwiftUI
import ReactNativeWatchOSCxx

/// Internal host node for content handed to a modifier (the body of
/// `.sheet`, `.overlay`, `.toolbar`, `.background(content:)`, …). The JS
/// `useModifiers` hook hoists such content out of the modifier params and
/// into a `__ModifierContent` child node carrying a `slot` prop; the
/// modifier pulls it back via `RNWModifierContext.content(slot)`. It
/// renders its children inline when asked, and is excluded from a parent's
/// inline children by `RNWShadowNodeSnapshot.viewChildren`.
enum RNWModifierContentView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("__ModifierContent") { _, children, _ in children }
    }
}
