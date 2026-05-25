import SwiftUI

/// SwiftUI `.matchedGeometryEffect(id:in:properties:isSource:)`.
///
/// LIMITATION (v1): SwiftUI matches geometry across views sharing a single
/// `@Namespace`. This bridge can't share a namespace across separate nodes,
/// so the effect is applied through a `ViewModifier` that owns a *local*
/// `@Namespace`. The geometry is therefore scoped to a single view and does
/// NOT match across views. Registered for API parity / self-contained
/// tagging only — cross-view matched-geometry transitions are unsupported.
enum RNWMatchedGeometryEffectModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("matchedGeometryEffect") { view, params, _ in
            guard let id = params.string("id") else { return view }
            let properties = parseProperties(params.string("properties"))
            let isSource = params.bool("isSource") ?? true
            return AnyView(view.modifier(
                LocalMatchedGeometryEffect(
                    id: id, properties: properties, isSource: isSource)))
        }
    }

    private static func parseProperties(
        _ value: String?
    ) -> MatchedGeometryProperties {
        switch value {
        case "position": return .position
        case "size": return .size
        default: return .frame
        }
    }
}

/// Applies `matchedGeometryEffect` against a namespace local to this
/// modifier instance. See the limitation note above.
private struct LocalMatchedGeometryEffect: ViewModifier {
    let id: String
    let properties: MatchedGeometryProperties
    let isSource: Bool
    @Namespace private var namespace

    func body(content: Content) -> some View {
        content.matchedGeometryEffect(
            id: id,
            in: namespace,
            properties: properties,
            isSource: isSource)
    }
}
