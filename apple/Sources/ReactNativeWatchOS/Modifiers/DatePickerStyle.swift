import SwiftUI

/// SwiftUI `.datePickerStyle(_:)`. Maps the `style` string to a date-picker
/// style. Unknown values fall back to `.automatic`.
enum RNWDatePickerStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("datePickerStyle") { view, params, _ in
            // DatePicker and its styles are watchOS 10+. On watchOS 9 the
            // view is returned unchanged.
            guard #available(watchOS 10.0, *) else { return view }
            switch params.string("style") {
            case "wheel":
                return AnyView(view.datePickerStyle(.wheel))
            default:
                return AnyView(view.datePickerStyle(.automatic))
            }
        }
    }
}
