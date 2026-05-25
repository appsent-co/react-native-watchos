import SwiftUI

/// Parses JS color strings into SwiftUI `Color`. Lives on the Swift side
/// so named colors pick up adaptive dark-mode variants (`.primary`, system
/// colors) — the C++ layer can't supply those.
enum RNWColorParser {
    static func parse(_ string: String) -> Color? {
        switch string {
        case "red":             return .red
        case "blue":            return .blue
        case "green":           return .green
        case "yellow":          return .yellow
        case "orange":          return .orange
        case "purple":          return .purple
        case "pink":            return .pink
        case "white":           return .white
        case "black":           return .black
        case "gray", "grey":    return .gray
        case "brown":           return .brown
        case "mint":            return .mint
        case "cyan":            return .cyan
        case "indigo":          return .indigo
        case "teal":            return .teal
        case "primary":         return .primary
        case "secondary":       return .secondary
        case "accent":          return .accentColor
        case "clear":           return .clear
        default:
            return string.hasPrefix("#") ? parseHex(string) : nil
        }
    }

    private static func parseHex(_ s: String) -> Color? {
        let hex = String(s.dropFirst())
        guard hex.count == 6 || hex.count == 8,
              let raw = UInt64(hex, radix: 16) else { return nil }
        let r, g, b, a: Double
        if hex.count == 8 {
            r = Double((raw >> 24) & 0xff) / 255
            g = Double((raw >> 16) & 0xff) / 255
            b = Double((raw >> 8)  & 0xff) / 255
            a = Double(raw         & 0xff) / 255
        } else {
            r = Double((raw >> 16) & 0xff) / 255
            g = Double((raw >> 8)  & 0xff) / 255
            b = Double(raw         & 0xff) / 255
            a = 1
        }
        return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}
