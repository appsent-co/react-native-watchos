import SwiftUI
import WatchKit
import ReactNativeWatchOSCxx

/// SwiftUI `Image`. Two sources:
///
///   - `systemName`: SF Symbol. Takes precedence when present.
///   - `source`: `{ uri, width?, height?, scale? }` from JS. The uri is
///     a real network URL (dev: Metro asset URL) or a bundle-relative
///     path (release: `--assets-dest` mirrors the asset under the .app).
///     `http(s)://` flows through SwiftUI `AsyncImage`; everything else
///     resolves against `Bundle.main.bundleURL` and decodes synchronously
///     so there's no phase flash for on-disk assets.
///
/// Image-only modifiers (`.resizable()`, …) are consumed up front via
/// `RNWImageModifierRegistry` so they stay `Image → Image`; the erased
/// view then flows through the generic modifier reduce.
enum RNWImageView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("Image") { snapshot, _, _ in
            // 1. SF Symbol — wins when present (existing behaviour).
            if let symbol = snapshot.props?.string("systemName"), !symbol.isEmpty {
                return AnyView(applyImageModifiers(snapshot.modifiers,
                                                   to: Image(systemName: symbol)))
            }

            // 2. source dict from require()/{uri}.
            if let source = snapshot.props?.dict("source"),
               let uri = source["uri"] as? String, !uri.isEmpty {
                let scale = (source["scale"] as? NSNumber).map { CGFloat($0.doubleValue) } ?? 1.0

                if uri.hasPrefix("http://") || uri.hasPrefix("https://") {
                    guard let url = URL(string: uri) else { return AnyView(EmptyView()) }
                    return AnyView(
                        AsyncImage(url: url, scale: scale) { phase in
                            if case let .success(image) = phase {
                                applyImageModifiers(snapshot.modifiers, to: image)
                            } else {
                                EmptyView()
                            }
                        }
                    )
                }

                if let url = resolveBundleURL(uri),
                   let data = try? Data(contentsOf: url),
                   let ui = UIImage(data: data) {
                    return AnyView(applyImageModifiers(snapshot.modifiers,
                                                       to: Image(uiImage: ui)))
                }
            }

            return AnyView(EmptyView())
        }
    }

    private static func resolveBundleURL(_ uri: String) -> URL? {
        if uri.hasPrefix("file://") { return URL(string: uri) }
        let cleaned = uri.hasPrefix("/") ? String(uri.dropFirst()) : uri
        return Bundle.main.bundleURL.appendingPathComponent(cleaned)
    }

    @MainActor
    private static func applyImageModifiers(_ modifiers: [Any], to image: Image) -> Image {
        var result = image
        for mod in modifiers {
            guard let dict = mod as? [String: Any],
                  let type = dict["$type"] as? String,
                  RNWImageModifierRegistry.shared.contains(type) else {
                continue
            }
            result = RNWImageModifierRegistry.shared.apply(dict, to: result)
        }
        return result
    }
}
