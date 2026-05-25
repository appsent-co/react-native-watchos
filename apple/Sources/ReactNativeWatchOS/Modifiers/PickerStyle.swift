import SwiftUI

/// SwiftUI `.pickerStyle(_:)`. Maps the `style` string to a picker style.
/// Unknown values fall back to `.automatic`.
enum RNWPickerStyleModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("pickerStyle") { view, params, _ in
            switch params.string("style") {
            case "navigationLink":
                return AnyView(view.pickerStyle(.navigationLink))
            case "wheel":
                return AnyView(view.pickerStyle(.wheel))
            case "inline":
                return AnyView(view.pickerStyle(.inline))
            default:
                return AnyView(view.pickerStyle(.automatic))
            }
        }
    }
}
