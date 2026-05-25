import SwiftUI

/// SwiftUI `.controlSize(_:)`. Maps the `style` string to a `ControlSize`.
/// `.extraLarge` is watchOS 10+; on older systems it falls back to
/// `.large`. Unknown values fall back to `.regular`.
enum RNWControlSizeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("controlSize") { view, params, _ in
            switch params.string("style") {
            case "mini":
                return AnyView(view.controlSize(.mini))
            case "small":
                return AnyView(view.controlSize(.small))
            case "large":
                return AnyView(view.controlSize(.large))
            case "extraLarge":
                if #available(watchOS 10.0, *) {
                    return AnyView(view.controlSize(.extraLarge))
                }
                return AnyView(view.controlSize(.large))
            default:
                return AnyView(view.controlSize(.regular))
            }
        }
    }
}
