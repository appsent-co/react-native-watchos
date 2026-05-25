import SwiftUI

/// String → SwiftUI value parsers shared across modifiers. Add here when
/// more than one modifier needs the same mapping. watchOS 9 baseline;
/// newer APIs are `#available`-gated.

enum RNWAlignmentParser {
    static func alignment(_ s: String?) -> Alignment {
        switch s {
        case "leading":        return .leading
        case "trailing":       return .trailing
        case "top":            return .top
        case "bottom":         return .bottom
        case "topLeading":     return .topLeading
        case "topTrailing":    return .topTrailing
        case "bottomLeading":  return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        case "leadingFirstTextBaseline":  return .leadingFirstTextBaseline
        case "trailingLastTextBaseline":  return .trailingLastTextBaseline
        default:               return .center
        }
    }

    static func horizontal(_ s: String?) -> HorizontalAlignment {
        switch s {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }

    static func vertical(_ s: String?) -> VerticalAlignment {
        switch s {
        case "top":               return .top
        case "bottom":            return .bottom
        case "firstTextBaseline": return .firstTextBaseline
        case "lastTextBaseline":  return .lastTextBaseline
        default:                  return .center
        }
    }

    static func textAlignment(_ s: String?) -> TextAlignment {
        switch s {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }
}

enum RNWVisibilityParser {
    static func parse(_ s: String?) -> Visibility {
        switch s {
        case "visible": return .visible
        case "hidden":  return .hidden
        default:        return .automatic
        }
    }
}

enum RNWEdgeParser {
    /// Single edge, "horizontal"/"vertical"/"all", or an array of edges.
    static func edgeSet(_ value: Any?) -> Edge.Set {
        if let s = value as? String { return single(s) }
        if let arr = value as? [Any] {
            var set: Edge.Set = []
            for item in arr {
                if let s = item as? String { set.insert(single(s)) }
            }
            return set.isEmpty ? .all : set
        }
        return .all
    }

    private static func single(_ s: String) -> Edge.Set {
        switch s {
        case "top":        return .top
        case "bottom":     return .bottom
        case "leading":    return .leading
        case "trailing":   return .trailing
        case "horizontal": return .horizontal
        case "vertical":   return .vertical
        default:           return .all
        }
    }
}

enum RNWFontParsers {
    static func weight(_ s: String?) -> Font.Weight? {
        switch s {
        case "ultraLight": return .ultraLight
        case "thin":       return .thin
        case "light":      return .light
        case "regular":    return .regular
        case "medium":     return .medium
        case "semibold":   return .semibold
        case "bold":       return .bold
        case "heavy":      return .heavy
        case "black":      return .black
        default:           return nil
        }
    }

    static func design(_ s: String?) -> Font.Design? {
        switch s {
        case "default":    return .default
        case "serif":      return .serif
        case "rounded":    return .rounded
        case "monospaced": return .monospaced
        default:           return nil
        }
    }

    static func textStyle(_ s: String?) -> Font.TextStyle? {
        switch s {
        case "largeTitle":  return .largeTitle
        case "title":       return .title
        case "title2":      return .title2
        case "title3":      return .title3
        case "headline":    return .headline
        case "subheadline": return .subheadline
        case "body":        return .body
        case "callout":     return .callout
        case "footnote":    return .footnote
        case "caption":     return .caption
        case "caption2":    return .caption2
        default:            return nil
        }
    }
}

enum RNWShapeStyleParser {
    /// Color (named/hex), hierarchical level, or (watchOS 10+) material.
    /// Nil when unrecognized so callers can fall back.
    static func parse(_ string: String?) -> AnyShapeStyle? {
        guard let string else { return nil }
        switch string {
        case "primary":    return AnyShapeStyle(.primary)
        case "secondary":  return AnyShapeStyle(.secondary)
        case "tertiary":   return AnyShapeStyle(.tertiary)
        case "quaternary": return AnyShapeStyle(.quaternary)
        case "tint":       return AnyShapeStyle(.tint)
        case "ultraThinMaterial",
             "thinMaterial",
             "regularMaterial",
             "thickMaterial",
             "ultraThickMaterial":
            // watchOS 10+. `.bar` is iOS-only.
            if #available(watchOS 10.0, *) {
                switch string {
                case "ultraThinMaterial":  return AnyShapeStyle(.ultraThinMaterial)
                case "thinMaterial":       return AnyShapeStyle(.thinMaterial)
                case "regularMaterial":    return AnyShapeStyle(.regularMaterial)
                case "thickMaterial":      return AnyShapeStyle(.thickMaterial)
                default:                   return AnyShapeStyle(.ultraThickMaterial)
                }
            }
            return nil
        default:
            if let color = RNWColorParser.parse(string) {
                return AnyShapeStyle(color)
            }
            return nil
        }
    }
}
