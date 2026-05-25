import SwiftUI

/// SwiftUI `.defaultAppStorage(_:)`. Sets the `UserDefaults` store that
/// descendant `@AppStorage` properties read from and write to. Falls back
/// to `.standard` when no `suiteName` is given or the named suite can't be
/// opened.
enum RNWDefaultAppStorageModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("defaultAppStorage") { view, params, _ in
            let store: UserDefaults
            if let suiteName = params.string("suiteName"),
               let suite = UserDefaults(suiteName: suiteName) {
                store = suite
            } else {
                store = .standard
            }
            return AnyView(view.defaultAppStorage(store))
        }
    }
}
