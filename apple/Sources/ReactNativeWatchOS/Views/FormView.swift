import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Form`. Container for settings/data-entry UI — children render
/// as grouped, scrolling rows. Typically holds `Section`s with `Toggle`,
/// `Slider`, and `TextField` controls.
enum RNWFormView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Form") { _, children, _ in
            AnyView(Form { children })
        }
    }
}
