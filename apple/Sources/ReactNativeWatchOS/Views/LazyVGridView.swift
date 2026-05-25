import SwiftUI
import ReactNativeWatchOSCxx

enum RNWLazyVGridView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("LazyVGrid") { snapshot, children, _ in
            let columns = parseGridItems(snapshot.props?["columns"] as? [Any])
            let alignment = parseAlignment(snapshot.props?.string("alignment"))
            let spacing = snapshot.props?.cgFloat("spacing")
            let pinned = parsePinnedViews(snapshot.props?["pinnedViews"] as? [Any])
            return AnyView(
                LazyVGrid(
                    columns: columns,
                    alignment: alignment,
                    spacing: spacing,
                    pinnedViews: pinned
                ) {
                    children
                }
            )
        }
    }

    private static func parseAlignment(_ s: String?) -> HorizontalAlignment {
        switch s {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }

    /// Missing `maximum` on flexible/adaptive becomes `.infinity` — matches
    /// SwiftUI's own default. Shared with `RNWLazyHGridView`.
    static func parseGridItems(_ raw: [Any]?) -> [GridItem] {
        guard let raw else { return [] }
        return raw.compactMap { entry in
            guard let dict = entry as? [String: Any],
                  let size = dict["size"] as? [String: Any],
                  let kind = size["kind"] as? String else { return nil }

            let spacing = dict.cgFloat("spacing")
            let alignment = parseGridItemAlignment(dict.string("alignment"))

            switch kind {
            case "fixed":
                guard let value = size.cgFloat("value") else { return nil }
                return GridItem(.fixed(value), spacing: spacing, alignment: alignment)
            case "flexible":
                let minimum = size.cgFloat("minimum") ?? 10
                let maximum = size.cgFloat("maximum") ?? .infinity
                return GridItem(
                    .flexible(minimum: minimum, maximum: maximum),
                    spacing: spacing,
                    alignment: alignment
                )
            case "adaptive":
                guard let minimum = size.cgFloat("minimum") else { return nil }
                let maximum = size.cgFloat("maximum") ?? .infinity
                return GridItem(
                    .adaptive(minimum: minimum, maximum: maximum),
                    spacing: spacing,
                    alignment: alignment
                )
            default:
                return nil
            }
        }
    }

    static func parsePinnedViews(_ raw: [Any]?) -> PinnedScrollableViews {
        guard let raw else { return [] }
        var set: PinnedScrollableViews = []
        for entry in raw {
            switch entry as? String {
            case "sectionHeaders": set.insert(.sectionHeaders)
            case "sectionFooters": set.insert(.sectionFooters)
            default: break
            }
        }
        return set
    }

    private static func parseGridItemAlignment(_ s: String?) -> Alignment {
        switch s {
        case "leading":        return .leading
        case "trailing":       return .trailing
        case "top":            return .top
        case "bottom":         return .bottom
        case "topLeading":     return .topLeading
        case "topTrailing":    return .topTrailing
        case "bottomLeading":  return .bottomLeading
        case "bottomTrailing": return .bottomTrailing
        default:               return .center
        }
    }
}
