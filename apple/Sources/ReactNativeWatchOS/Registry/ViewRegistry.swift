import SwiftUI
import ReactNativeWatchOSCxx

/// View-builder shape.
///
/// - `children` is pre-rendered through the modifier pipeline; leaves
///   that need the raw tree (e.g. Text walking rawText) read
///   `snapshot.children` directly instead.
public typealias RNWViewBuilder = (
    _ snapshot: RNWShadowNodeSnapshot,
    _ children: AnyView,
    _ bus: RNWEventBus
) -> AnyView

/// `viewName` (from JS) → SwiftUI builder.
@MainActor
public final class RNWViewRegistry {
    public static let shared = RNWViewRegistry()
    private var builders: [String: RNWViewBuilder] = [:]
    private init() {}

    public func register(_ name: String, builder: @escaping RNWViewBuilder) {
        builders[name] = builder
    }

    public func builder(for name: String?) -> RNWViewBuilder? {
        guard let name else { return nil }
        return builders[name]
    }
}
