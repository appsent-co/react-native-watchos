import SwiftUI

/// SwiftUI `.dynamicTypeSize(_:)`. Pins the subtree to a fixed
/// `DynamicTypeSize` instead of tracking the system text-size setting.
/// Requires watchOS 9.0+ — returns the view unchanged on older systems.
enum RNWDynamicTypeSizeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("dynamicTypeSize") { view, params, _ in
            if #available(watchOS 9.0, *) {
                guard let size = parse(params.string("size")) else { return view }
                return AnyView(view.dynamicTypeSize(size))
            }
            return view
        }
    }

    @available(watchOS 9.0, *)
    private static func parse(_ s: String?) -> DynamicTypeSize? {
        switch s {
        case "xSmall":         return .xSmall
        case "small":          return .small
        case "medium":         return .medium
        case "large":          return .large
        case "xLarge":         return .xLarge
        case "xxLarge":        return .xxLarge
        case "xxxLarge":       return .xxxLarge
        case "accessibility1": return .accessibility1
        case "accessibility2": return .accessibility2
        case "accessibility3": return .accessibility3
        case "accessibility4": return .accessibility4
        case "accessibility5": return .accessibility5
        default:               return nil
        }
    }
}
