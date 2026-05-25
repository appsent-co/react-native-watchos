import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `Image`. Phase 8 scope is SF Symbols only — the watch-app
/// asset catalog story is its own rabbit hole and isn't needed yet.
///
/// Image-only modifiers (`.resizable()`, …) are consumed up front via
/// `RNWImageModifierRegistry` so they stay `Image → Image`; then the
/// erased view flows through the generic modifier reduce.
enum RNWImageView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Image") { snapshot, _, _ in
            // SF Symbol name is the only source we support for now.
            // Pass `name` if/when asset-catalog images come online.
            let symbol = snapshot.props?.string("systemName") ?? ""
            var image = Image(systemName: symbol)

            for mod in snapshot.modifiers {
                guard let dict = mod as? [String: Any],
                      let type = dict["$type"] as? String,
                      RNWImageModifierRegistry.shared.contains(type) else {
                    continue
                }
                image = RNWImageModifierRegistry.shared.apply(dict, to: image)
            }

            return AnyView(image)
        }
    }
}
