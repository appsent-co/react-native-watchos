import SwiftUI

/// SwiftUI `.blendMode(_:)`. Maps the JS `mode` string to a SwiftUI
/// `BlendMode`. Unknown / missing values fall back to `.normal`.
enum RNWBlendModeModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("blendMode") { view, params, _ in
            AnyView(view.blendMode(parse(params.string("mode"))))
        }
    }

    private static func parse(_ s: String?) -> BlendMode {
        switch s {
        case "multiply":    return .multiply
        case "screen":      return .screen
        case "overlay":     return .overlay
        case "darken":      return .darken
        case "lighten":     return .lighten
        case "colorDodge":  return .colorDodge
        case "colorBurn":   return .colorBurn
        case "softLight":   return .softLight
        case "hardLight":   return .hardLight
        case "difference":  return .difference
        case "exclusion":   return .exclusion
        case "hue":         return .hue
        case "saturation":  return .saturation
        case "color":       return .color
        case "luminosity":  return .luminosity
        case "plusDarker":  return .plusDarker
        case "plusLighter": return .plusLighter
        default:            return .normal
        }
    }
}
