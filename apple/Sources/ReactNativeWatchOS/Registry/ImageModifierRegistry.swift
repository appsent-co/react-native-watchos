import SwiftUI

/// `Image → Image` applier. `.resizable()` / `.renderingMode(_:)` /
/// `.interpolation(_:)` / `.antialiased(_:)` return `Image`, not `some
/// View` — chaining them here keeps the type so subsequent Image-only
/// modifiers still apply before generic AnyView erasure.
public typealias RNWImageModifierApplier = (
    _ image: Image,
    _ params: [String: Any]
) -> Image

@MainActor
public final class RNWImageModifierRegistry {
    public static let shared = RNWImageModifierRegistry()
    private var appliers: [String: RNWImageModifierApplier] = [:]
    private init() {}

    public func register(_ type: String, applier: @escaping RNWImageModifierApplier) {
        appliers[type] = applier
    }

    public func apply(_ modifier: [String: Any], to image: Image) -> Image {
        guard let type = modifier["$type"] as? String,
              let applier = appliers[type] else { return image }
        return applier(image, modifier)
    }

    public func contains(_ type: String) -> Bool {
        appliers[type] != nil
    }
}
