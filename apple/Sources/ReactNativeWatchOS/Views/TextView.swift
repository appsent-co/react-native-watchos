import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Text` registration. Concatenates direct rawText children
/// (one per JSX string literal) into a single styled `Text`. Any
/// text-only modifiers are applied here to preserve the `Text → Text`
/// overload chain; generic modifiers (`.padding`, `.background`,
/// `.foregroundColor`, `.font`) flow through the renderer's reduce.
enum RNWTextView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Text") { snapshot, _, _ in
            var text = Text(joinRawTextChildren(of: snapshot))

            for mod in snapshot.modifiers {
                guard let dict = mod as? [String: Any],
                      let type = dict["$type"] as? String,
                      RNWTextModifierRegistry.shared.contains(type) else {
                    continue
                }
                text = RNWTextModifierRegistry.shared.apply(dict, to: text)
            }

            return AnyView(text)
        }
    }

    private static func joinRawTextChildren(
        of snapshot: RNWShadowNodeSnapshot
    ) -> String {
        var out = ""
        for child in snapshot.children where child.kind == .rawText {
            if let s = child.text { out.append(s) }
        }
        return out
    }
}
